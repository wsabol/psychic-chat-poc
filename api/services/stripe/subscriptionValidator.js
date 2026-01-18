/**
 * Subscription Validator Service
 * 
 * Validates subscription status and payment methods
 * Used during login, periodic checks, and access control
 */

import { stripe } from './stripeClient.js';
import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Get decrypted subscription ID from database
 */
async function getSubscriptionIdFromDB(userId) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    const query = `SELECT 
      pgp_sym_decrypt(stripe_subscription_id_encrypted, $1) as stripe_subscription_id
      FROM user_personal_info WHERE user_id = $2`;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);
    
    if (result.rows.length === 0 || !result.rows[0].stripe_subscription_id) {
      return null;
    }

    return result.rows[0].stripe_subscription_id;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-validator', userId);
    return null;
  }
}

/**
 * Get decrypted customer ID from database
 */
async function getCustomerIdFromDB(userId) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    const query = `SELECT 
      pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as stripe_customer_id
      FROM user_personal_info WHERE user_id = $2`;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);
    
    if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
      return null;
    }

    return result.rows[0].stripe_customer_id;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-validator', userId);
    return null;
  }
}

/**
 * Validate subscription status from Stripe
 * Returns: { valid: boolean, status: string, error?: string, reason?: string }
 */
export async function validateSubscriptionStatus(userId) {
  try {
    if (!stripe) {
      return {
        valid: false,
        status: 'unknown',
        error: 'Stripe not configured',
        reason: 'STRIPE_ERROR'
      };
    }

    // Get subscription ID from DB
    const subscriptionId = await getSubscriptionIdFromDB(userId);
    
    if (!subscriptionId) {
      return {
        valid: false,
        status: 'none',
        error: 'No subscription found',
        reason: 'NO_SUBSCRIPTION'
      };
    }

    // Fetch from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update last_status_check_at in DB
    await updateLastStatusCheck(userId);

    // Check if status is valid (active or trialing)
    const validStatuses = ['active', 'trialing'];
    const isValid = validStatuses.includes(subscription.status);

    // Update DB with current status if changed
    if (subscription.status !== (await getCurrentStatusFromDB(userId))) {
      await updateSubscriptionStatusInDB(userId, {
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
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
        cancellation_details: subscription.cancellation_details,
      }
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-validator', userId);
    
    return {
      valid: false,
      status: 'error',
      error: 'Could not verify subscription',
      reason: 'STRIPE_API_ERROR'
    };
  }
}

/**
 * Validate payment method validity
 * Returns: { valid: boolean, error?: string, reason?: string }
 */
export async function validatePaymentMethod(userId) {
  try {
    if (!stripe) {
      return {
        valid: false,
        error: 'Stripe not configured',
        reason: 'STRIPE_ERROR'
      };
    }

    const customerId = await getCustomerIdFromDB(userId);
    
    if (!customerId) {
      return {
        valid: false,
        error: 'No customer found',
        reason: 'NO_CUSTOMER'
      };
    }

    const customer = await stripe.customers.retrieve(customerId);

    // Check if default payment method exists
    if (!customer.invoice_settings?.default_payment_method) {
      return {
        valid: false,
        error: 'No payment method on file',
        reason: 'NO_PAYMENT_METHOD'
      };
    }

    // Verify payment method is still valid
    const paymentMethodId = customer.invoice_settings.default_payment_method;
    
    if (typeof paymentMethodId === 'string') {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      // Check if card is expired
      if (paymentMethod.type === 'card') {
        const { exp_year, exp_month } = paymentMethod.card;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (exp_year < currentYear || (exp_year === currentYear && exp_month < currentMonth)) {
          return {
            valid: false,
            error: 'Payment method has expired',
            reason: 'CARD_EXPIRED',
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
      reason: 'STRIPE_API_ERROR'
    };
  }
}

/**
 * Comprehensive subscription health check
 * Validates both subscription status AND payment method
 */
export async function validateSubscriptionHealth(userId) {
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
 * Get the status from database
 */
async function getCurrentStatusFromDB(userId) {
  try {
    const result = await db.query(
      'SELECT subscription_status FROM user_personal_info WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.subscription_status || null;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-validator', userId);
    return null;
  }
}

/**
 * Update subscription status in database
 */
async function updateSubscriptionStatusInDB(userId, statusUpdate) {
  try {
    const query = `UPDATE user_personal_info SET 
      subscription_status = $1,
      current_period_start = $2,
      current_period_end = $3,
      updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4`;

    await db.query(query, [
      statusUpdate.status,
      statusUpdate.current_period_start,
      statusUpdate.current_period_end,
      userId
    ]);
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-validator', userId);
  }
}

/**
 * Update last status check timestamp
 */
export async function updateLastStatusCheck(userId) {
  try {
    await db.query(
      'UPDATE user_personal_info SET last_status_check_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-validator', userId);
  }
}

/**
 * Get human-readable message for blocked access
 */
function getBlockedMessage(subscriptionCheck, paymentCheck) {
  if (!subscriptionCheck.valid) {
    switch (subscriptionCheck.reason) {
      case 'NO_SUBSCRIPTION':
        return 'No active subscription. Please create one to continue.';
      case 'STRIPE_API_ERROR':
        return 'We cannot verify your subscription. Please try again or contact support.';
      default:
        return `Subscription status: ${subscriptionCheck.status}. Please update your subscription.`;
    }
  }

  if (!paymentCheck.valid) {
    switch (paymentCheck.reason) {
      case 'NO_PAYMENT_METHOD':
        return 'No payment method on file. Please add one to continue.';
      case 'CARD_EXPIRED':
        return 'Your payment method has expired. Please update it to continue.';
      case 'STRIPE_API_ERROR':
        return 'We cannot verify your payment method. Please try again or contact support.';
      default:
        return 'Your payment method needs attention. Please update it.';
    }
  }

  return 'Your subscription needs attention. Please check your billing.';
}

/**
 * Get subscription status from database (cached)
 */
export async function getCachedSubscriptionStatus(userId) {
  try {
    const result = await db.query(
      `SELECT 
        subscription_status, 
        current_period_start, 
        current_period_end,
        last_status_check_at
        FROM user_personal_info 
        WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      status: result.rows[0].subscription_status,
      current_period_start: result.rows[0].current_period_start,
      current_period_end: result.rows[0].current_period_end,
      lastCheckAt: result.rows[0].last_status_check_at
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-validator', userId);
    return null;
  }
}

export default {
  validateSubscriptionStatus,
  validatePaymentMethod,
  validateSubscriptionHealth,
  getCachedSubscriptionStatus,
  updateLastStatusCheck
};
