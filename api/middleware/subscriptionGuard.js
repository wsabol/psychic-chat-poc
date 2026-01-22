/**
 * Subscription Guard Middleware
 * 
 * Ensures user has valid, active subscription before accessing protected routes
 * Blocks access if:
 * - No subscription
 * - Subscription status: past_due, canceled, incomplete, unpaid, paused
 * - Payment method invalid or expired
 * 
 * Applied to: All protected routes except billing/settings
 */

import { validateSubscriptionHealth, getCachedSubscriptionStatus } from '../services/stripe/subscriptionValidator.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { authError, forbiddenError, ErrorCodes } from '../utils/responses.js';

/**
 * Subscription Guard Middleware
 */
export async function subscriptionGuard(req, res, next) {
  try {
    // Get user_id from JWT token (added by authenticateToken middleware)
    const userId = req.user?.uid;

      if (!userId) {
        return authError(res, 'User information not found', ErrorCodes.UNAUTHORIZED);
      }

    // Get cached subscription status first (faster)
    const cachedStatus = await getCachedSubscriptionStatus(userId);

    // If cached status is valid and recent (less than 4 hours old), use it
    if (cachedStatus && isStatusValid(cachedStatus.status)) {
      const lastCheck = new Date(cachedStatus.lastCheckAt);
      const hoursSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCheck < 4) {
        // Status is valid and recent - allow access
        req.subscription = {
          status: cachedStatus.status,
          fromCache: true
        };
        return next();
      }
    }

    // If cached status is old or invalid, do full validation (calls Stripe API)
    const health = await validateSubscriptionHealth(userId);

    if (!health.healthy) {
      // Subscription is not healthy - block access
      return res.status(403).json({
        error: 'Subscription Required',
        message: health.blockedMessage,
        errorCode: ErrorCodes.FORBIDDEN,
        blockedReason: health.blockedReason,
        subscription: {
          status: health.subscription.status,
          paymentMethod: {
            valid: health.paymentMethod.valid
          }
        },
        action: {
          type: 'STRIPE_PORTAL',
          message: 'Please update your subscription at the Stripe billing portal',
          link: '/billing/stripe-portal'
        }
      });
    }

    // Subscription is healthy - store info and continue
    req.subscription = {
      status: health.subscription.status,
      paymentValid: health.paymentMethod.valid,
      fromCache: false
    };

    next();
  } catch (error) {
    logErrorFromCatch(error, 'middleware', 'subscription-guard', req.user?.uid);

    // If Stripe is down or API error, let user continue but flag it
    return res.status(503).json({
      error: 'Service Temporarily Unavailable',
      message: 'We are temporarily unable to verify your subscription. Please try again in a few moments.',
      errorCode: 'SERVICE_UNAVAILABLE_503',
      blockedReason: 'STRIPE_API_ERROR',
      action: {
        type: 'RETRY',
        message: 'Please refresh the page or try again shortly'
      }
    });
  }
}

/**
 * Soft Guard - logs warning but doesn't block access
 * Used for less critical routes
 */
export async function subscriptionGuardSoft(req, res, next) {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return next();
    }

    // Get cached status without validation
    const cachedStatus = await getCachedSubscriptionStatus(userId);

    if (cachedStatus) {
      req.subscription = {
        status: cachedStatus.status,
        valid: isStatusValid(cachedStatus.status)
      };

      // Log if subscription is invalid but don't block
      if (!req.subscription.valid) {
        logErrorFromCatch(
          new Error(`User with invalid subscription accessed resource: ${cachedStatus.status}`),
          'middleware',
          'subscription-guard-soft',
          userId,
          null,
          'warning'
        );
      }
    }

    next();
  } catch (error) {
    // Silently fail and continue - this is a soft guard
    next();
  }
}

/**
 * Check if subscription status is valid
 * Valid statuses allow access
 */
function isStatusValid(status) {
  const validStatuses = ['active', 'trialing'];
  return validStatuses.includes(status);
}

/**
 * Check subscription status (no blocking)
 * Returns subscription info in res.locals
 */
export async function checkSubscriptionStatus(req, res, next) {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return next();
    }

    const health = await validateSubscriptionHealth(userId);

    res.locals.subscription = {
      healthy: health.healthy,
      status: health.subscription.status,
      paymentValid: health.paymentMethod.valid,
      blockedReason: health.blockedReason
    };

    next();
  } catch (error) {
    // Silently fail
    res.locals.subscription = null;
    next();
  }
}

export default {
  subscriptionGuard,
  subscriptionGuardSoft,
  checkSubscriptionStatus
};
