/**
 * Billing Notifications Service - REFACTORED
 * 
 * Sends multi-channel notifications (Email + SMS + In-App) for subscription events
 * - Payment failures
 * - Subscription cancellations
 * - Payment method issues
 * - Price change notifications
 * 
 * This service now uses the modular email template system and notification orchestrator
 */

import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { sendMultiChannelNotification } from '../notifications/notificationOrchestrator.js';
import { getSMSMessage } from '../notifications/smsTemplates.js';
import { getUserContactInfo } from '../user/userContactService.js';
import { sendEmail } from '../../shared/email/emailSender.js';

// Email template imports
import { generatePaymentFailedEmail } from '../../shared/email/templates/paymentFailedEmail.js';
import { generateSubscriptionCancelledEmail } from '../../shared/email/templates/subscriptionCancelledEmail.js';
import { generatePaymentMethodInvalidEmail } from '../../shared/email/templates/paymentMethodInvalidEmail.js';
import { generateSubscriptionPastDueEmail } from '../../shared/email/templates/subscriptionPastDueEmail.js';
import { generateSubscriptionIncompleteEmail } from '../../shared/email/templates/subscriptionIncompleteEmail.js';
import { generateSubscriptionCheckFailedEmail } from '../../shared/email/templates/subscriptionCheckFailedEmail.js';
import { generateSubscriptionExpiringEmail } from '../../shared/email/templates/subscriptionExpiringEmail.js';

/**
 * Email template generators mapped to issue types
 */
const EMAIL_GENERATORS = {
  PAYMENT_FAILED: generatePaymentFailedEmail,
  SUBSCRIPTION_CANCELLED: generateSubscriptionCancelledEmail,
  PAYMENT_METHOD_INVALID: generatePaymentMethodInvalidEmail,
  SUBSCRIPTION_PAST_DUE: generateSubscriptionPastDueEmail,
  SUBSCRIPTION_INCOMPLETE: generateSubscriptionIncompleteEmail
};

/**
 * In-app notification messages
 */
const IN_APP_MESSAGES = {
  PAYMENT_FAILED: 'Your payment failed. Please update your payment method.',
  SUBSCRIPTION_CANCELLED: 'Your subscription has been cancelled.',
  PAYMENT_METHOD_INVALID: 'Your payment method is invalid or expired.',
  SUBSCRIPTION_PAST_DUE: 'Your subscription payment is overdue.',
  SUBSCRIPTION_INCOMPLETE: 'Your subscription setup is incomplete.'
};

/**
 * Send multi-channel notification for billing event
 * Sends: Email (SendGrid) + SMS (Twilio) + In-App (Database)
 * @param {string} userId - User ID
 * @param {string} issueType - Type of billing issue
 * @param {Object} [additionalData={}] - Additional data for templates
 * @returns {Promise<Object>} Notification result
 */
export async function notifyBillingEvent(userId, issueType, additionalData = {}) {
  try {
    const emailGenerator = EMAIL_GENERATORS[issueType];
    if (!emailGenerator) {
      logErrorFromCatch(
        new Error(`Unknown issue type: ${issueType}`),
        'app',
        'billing-notifications',
        userId
      );
      return { success: false, error: 'Unknown issue type' };
    }

    // Set default stripe portal link if not provided
    const stripePortalLink = additionalData.stripePortalLink || 'https://billing.stripe.com/';
    
    // Generate email content
    const emailContent = emailGenerator({
      stripePortalLink,
      ...additionalData
    });

    // Generate SMS message
    const smsMessage = getSMSMessage(issueType, { stripePortalLink });

    // Send multi-channel notification
    const result = await sendMultiChannelNotification({
      userId,
      email: {
        subject: emailContent.subject,
        html: emailContent.html
      },
      sms: smsMessage,
      inApp: {
        message: IN_APP_MESSAGES[issueType] || 'Subscription issue detected',
        severity: 'warning',
        context: {
          type: issueType
        }
      }
    });

    return { success: result.success };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'billing-notifications', userId);
    return { success: false, error: error.message };
  }
}

/**
 * Notify user when subscription check fails
 * @param {string} userId - User ID
 * @param {string} reason - Reason for failure
 * @returns {Promise<void>}
 */
export async function notifySubscriptionCheckFailed(userId, reason) {
  try {
    const userInfo = await getUserContactInfo(userId);
    if (!userInfo) return;

    let message = 'We are unable to verify your subscription status. Please try logging in again.';

    if (reason === 'STRIPE_API_DOWN') {
      message = 'Stripe is temporarily unavailable. We will verify your subscription shortly.';
    } else if (reason === 'NO_SUBSCRIPTION') {
      message = 'No subscription found on your account. Please create one to continue using the app.';
    }

    // Generate email content
    const emailContent = generateSubscriptionCheckFailedEmail({ reason });

    // Generate SMS message
    const smsMessage = getSMSMessage('SUBSCRIPTION_CHECK_FAILED', { message });

    // Send multi-channel notification
    await sendMultiChannelNotification({
      userId,
      email: {
        subject: emailContent.subject,
        html: emailContent.html
      },
      sms: smsMessage,
      inApp: {
        message,
        severity: 'info',
        context: {
          type: 'SUBSCRIPTION_CHECK_FAILED',
          reason
        }
      }
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'notify-subscription-check-failed', userId);
  }
}

/**
 * Notify user that their subscription is about to expire
 * @param {string} userId - User ID
 * @param {number} daysRemaining - Days remaining until expiration
 * @returns {Promise<void>}
 */
export async function notifySubscriptionExpiring(userId, daysRemaining) {
  try {
    const userInfo = await getUserContactInfo(userId);
    if (!userInfo) return;

    // Generate email content
    const emailContent = generateSubscriptionExpiringEmail({ daysRemaining });

    // Generate SMS message
    const smsMessage = getSMSMessage('SUBSCRIPTION_EXPIRING', { daysRemaining });

    const message = `Your subscription expires in ${daysRemaining} days. Renew now to avoid service interruption.`;

    // Send multi-channel notification
    await sendMultiChannelNotification({
      userId,
      email: {
        subject: emailContent.subject,
        html: emailContent.html
      },
      sms: smsMessage,
      inApp: {
        message,
        severity: 'warning',
        context: {
          type: 'SUBSCRIPTION_EXPIRING',
          daysRemaining
        }
      }
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'notify-subscription-expiring', userId);
  }
}

/**
 * Send price change notification to all active subscribers with a specific interval
 * Uses database ID (not hashed user_id) for foreign key relationship
 * user_id column contains hashed value for logging/errors
 * @param {string} interval - 'month' or 'year'
 * @param {number} oldAmount - Old price in cents
 * @param {number} newAmount - New price in cents
 * @param {string} oldPriceId - Old Stripe price ID (optional)
 * @param {string} newPriceId - New Stripe price ID (optional)
 * @returns {Promise<Object>} Results with success/failure counts
 */
export async function sendPriceChangeNotifications(interval, oldAmount, newAmount, oldPriceId = null, newPriceId = null) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    // Get all active subscribers with this interval
    // id = database ID (for price_change_notifications FK), user_id = hashed value (for logging)
    const query = `
      SELECT 
        id,
        user_id,
        pgp_sym_decrypt(email_encrypted, $1) as email,
        current_period_end
      FROM user_personal_info
      WHERE price_interval = $2
        AND subscription_status = 'active'
        AND stripe_subscription_id_encrypted IS NOT NULL
        AND email_encrypted IS NOT NULL
      ORDER BY id
    `;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY, interval]);
    const subscribers = result.rows;

    const results = {
      total: subscribers.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Import the existing price change email template
    const { generatePriceChangeEmail } = await import('../../shared/email/templates/priceChangeEmail.js');

    for (const subscriber of subscribers) {
      try {
        const effectiveDate = new Date(subscriber.current_period_end * 1000);
        
        // Generate email using existing template
        const emailContent = generatePriceChangeEmail({
          interval,
          oldAmount,
          newAmount,
          effectiveDate
        });

        // Send email
        await sendEmail({
          to: subscriber.email,
          subject: emailContent.subject,
          html: emailContent.html
        });

        // Record notification using database ID (subscriber.id, not hashed user_id)
        await db.query(
          `INSERT INTO price_change_notifications 
           (user_id, old_price_id, new_price_id, old_price_amount, new_price_amount, price_interval, effective_date, email_sent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
          [subscriber.id, oldPriceId, newPriceId, oldAmount, newAmount, interval, effectiveDate]
        );

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: subscriber.user_id, // hashed user_id for logging
          email: subscriber.email,
          error: error.message,
        });
        logErrorFromCatch(error, 'app', 'send-price-change-email', subscriber.user_id);
      }
    }

    return results;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'send-price-change-notifications');
    throw error;
  }
}

export default {
  notifyBillingEvent,
  notifySubscriptionCheckFailed,
  notifySubscriptionExpiring,
  sendPriceChangeNotifications
};
