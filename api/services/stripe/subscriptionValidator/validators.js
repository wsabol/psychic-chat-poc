/**
 * Validation Logic for Subscriptions and Payment Methods
 * Contains core business logic separated from data access
 */

import { stripe } from '../stripeClient.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';
import {
  getSubscriptionIdFromDB,
  getCustomerIdFromDB,
  getCurrentStatusFromDB,
  updateSubscriptionStatusInDB,
  updateLastStatusCheckInDB
} from './repository.js';
import {
  VALID_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS,
  VALIDATION_REASON,
  BLOCKED_MESSAGES,
  PAYMENT_METHOD_TYPE
} from './constants.js';

/**
 * Validate input userId
 * @param {string} userId - User ID to validate
 * @returns {Object} Validation result
 */
function validateUserId(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return {
      valid: false,
      error: 'Invalid user ID',
      reason: VALIDATION_REASON.INVALID_USER_ID
    };
  }
  return { valid: true };
}

/**
 * Check if Stripe is configured
 * @returns {Object} Configuration check result
 */
function checkStripeConfiguration() {
  if (!stripe) {
    return {
      configured: false,
      error: 'Stripe not configured',
      reason: VALIDATION_REASON.STRIPE_ERROR
    };
  }
  return { configured: true };
}

/**
 * Check if a card is expired
 * @param {number} expYear - Expiration year
 * @param {number} expMonth - Expiration month
 * @returns {boolean}
 */
function isCardExpired(expYear, expMonth) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return expYear < currentYear || (expYear === currentYear && expMonth < currentMonth);
}

/**
 * Validate subscription status from Stripe
 * @param {string} userId - User ID
 * @returns {Promise<SubscriptionValidationResult>}
 */
export async function validateSubscriptionStatus(userId) {
  try {
    // Validate input
    const userIdCheck = validateUserId(userId);
    if (!userIdCheck.valid) {
      return {
        valid: false,
        status: SUBSCRIPTION_STATUS.UNKNOWN,
        error: userIdCheck.error,
        reason: userIdCheck.reason
      };
    }

    // Check Stripe configuration
    const stripeCheck = checkStripeConfiguration();
    if (!stripeCheck.configured) {
      return {
        valid: false,
        status: SUBSCRIPTION_STATUS.UNKNOWN,
        error: stripeCheck.error,
        reason: stripeCheck.reason
      };
    }

    // Get subscription ID from DB
    const subIdResult = await getSubscriptionIdFromDB(userId);
    
    if (!subIdResult.success || !subIdResult.data) {
      return {
        valid: false,
        status: SUBSCRIPTION_STATUS.NONE,
        error: 'No subscription found',
        reason: VALIDATION_REASON.NO_SUBSCRIPTION
      };
    }

    const subscriptionId = subIdResult.data;

    // Fetch from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update last_status_check_at in DB
    await updateLastStatusCheckInDB(userId);

    // Check if status is valid (active or trialing)
    const isValid = VALID_SUBSCRIPTION_STATUSES.includes(subscription.status);

    // Get current status from DB to check if it changed
    const currentStatusResult = await getCurrentStatusFromDB(userId);
    const currentStatus = currentStatusResult.success ? currentStatusResult.data : null;

    // Update DB with current status if changed
    if (subscription.status !== currentStatus) {
      await updateSubscriptionStatusInDB(userId, {
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end
      });
    }

    return {
      valid: isValid,
      status: subscription.status,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancellation_details: subscription.cancellation_details
      }
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-validator', userId);
    
    return {
      valid: false,
      status: SUBSCRIPTION_STATUS.ERROR,
      error: 'Could not verify subscription',
      reason: VALIDATION_REASON.STRIPE_API_ERROR
    };
  }
}

/**
 * Validate payment method validity
 * @param {string} userId - User ID
 * @returns {Promise<PaymentMethodValidationResult>}
 */
export async function validatePaymentMethod(userId) {
  try {
    // Validate input
    const userIdCheck = validateUserId(userId);
    if (!userIdCheck.valid) {
      return {
        valid: false,
        error: userIdCheck.error,
        reason: userIdCheck.reason
      };
    }

    // Check Stripe configuration
    const stripeCheck = checkStripeConfiguration();
    if (!stripeCheck.configured) {
      return {
        valid: false,
        error: stripeCheck.error,
        reason: stripeCheck.reason
      };
    }

    // Get customer ID from DB
    const customerIdResult = await getCustomerIdFromDB(userId);
    
    if (!customerIdResult.success || !customerIdResult.data) {
      return {
        valid: false,
        error: 'No customer found',
        reason: VALIDATION_REASON.NO_CUSTOMER
      };
    }

    const customerId = customerIdResult.data;
    const customer = await stripe.customers.retrieve(customerId);

    // Check if default payment method exists
    if (!customer.invoice_settings?.default_payment_method) {
      return {
        valid: false,
        error: 'No payment method on file',
        reason: VALIDATION_REASON.NO_PAYMENT_METHOD
      };
    }

    // Verify payment method is still valid
    const paymentMethodId = customer.invoice_settings.default_payment_method;
    
    if (typeof paymentMethodId === 'string') {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      // Check if card is expired
      if (paymentMethod.type === PAYMENT_METHOD_TYPE.CARD) {
        const { exp_year, exp_month } = paymentMethod.card;

        if (isCardExpired(exp_year, exp_month)) {
          return {
            valid: false,
            error: 'Payment method has expired',
            reason: VALIDATION_REASON.CARD_EXPIRED,
            lastFour: paymentMethod.card.last4
          };
        }
      }

      return {
        valid: true,
        paymentMethod: {
          id: paymentMethodId,
          type: paymentMethod.type,
          lastFour: paymentMethod.card?.last4 || null
        }
      };
    }

    return { valid: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'payment-method-validator', userId);
    
    return {
      valid: false,
      error: 'Could not verify payment method',
      reason: VALIDATION_REASON.STRIPE_API_ERROR
    };
  }
}

/**
 * Comprehensive subscription health check
 * Validates both subscription status AND payment method
 * @param {string} userId - User ID
 * @returns {Promise<SubscriptionHealthResult>}
 */
export async function validateSubscriptionHealth(userId) {
  // Validate input first
  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    return {
      healthy: false,
      subscription: {
        valid: false,
        status: SUBSCRIPTION_STATUS.UNKNOWN,
        error: userIdCheck.error,
        reason: userIdCheck.reason
      },
      paymentMethod: {
        valid: false,
        error: userIdCheck.error,
        reason: userIdCheck.reason
      },
      blockedReason: userIdCheck.reason,
      blockedMessage: userIdCheck.error
    };
  }

  // Run both validations
  const subscriptionCheck = await validateSubscriptionStatus(userId);
  const paymentCheck = await validatePaymentMethod(userId);

  // Overall health is valid only if BOTH are valid
  const isHealthy = subscriptionCheck.valid && paymentCheck.valid;

  return {
    healthy: isHealthy,
    subscription: subscriptionCheck,
    paymentMethod: paymentCheck,
    blockedReason: isHealthy ? null : (subscriptionCheck.reason || paymentCheck.reason),
    blockedMessage: isHealthy ? null : getBlockedMessage(subscriptionCheck, paymentCheck)
  };
}

/**
 * Get human-readable message for blocked access
 * @param {SubscriptionValidationResult} subscriptionCheck - Subscription validation result
 * @param {PaymentMethodValidationResult} paymentCheck - Payment method validation result
 * @returns {string}
 */
export function getBlockedMessage(subscriptionCheck, paymentCheck) {
  if (!subscriptionCheck.valid) {
    switch (subscriptionCheck.reason) {
      case VALIDATION_REASON.NO_SUBSCRIPTION:
        return BLOCKED_MESSAGES.NO_SUBSCRIPTION;
      case VALIDATION_REASON.STRIPE_API_ERROR:
        return BLOCKED_MESSAGES.STRIPE_API_ERROR;
      default:
        return `Subscription status: ${subscriptionCheck.status}. Please update your subscription.`;
    }
  }

  if (!paymentCheck.valid) {
    switch (paymentCheck.reason) {
      case VALIDATION_REASON.NO_PAYMENT_METHOD:
        return BLOCKED_MESSAGES.NO_PAYMENT_METHOD;
      case VALIDATION_REASON.CARD_EXPIRED:
        return BLOCKED_MESSAGES.CARD_EXPIRED;
      case VALIDATION_REASON.STRIPE_API_ERROR:
        return BLOCKED_MESSAGES.PAYMENT_VERIFICATION_ERROR;
      default:
        return 'Your payment method needs attention. Please update it.';
    }
  }

  return BLOCKED_MESSAGES.DEFAULT;
}
