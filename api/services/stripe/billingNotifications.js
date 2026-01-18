/**
 * Billing Notifications Service
 * 
 * Sends multi-channel notifications (Email + SMS + In-App) for subscription events
 * - Payment failures
 * - Subscription cancellations
 * - Payment method issues
 */

import sgMail from '@sendgrid/mail';
import { sendSMS } from '../../shared/smsService.js';
import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import crypto from 'crypto';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com';

/**
 * Issue types and their messages
 */
const notificationTemplates = {
  PAYMENT_FAILED: {
    subject: 'Payment Failed - Update Required',
    template: 'paymentFailed'
  },
  SUBSCRIPTION_CANCELLED: {
    subject: 'Subscription Cancelled',
    template: 'subscriptionCancelled'
  },
  PAYMENT_METHOD_INVALID: {
    subject: 'Payment Method Needs Attention',
    template: 'paymentMethodInvalid'
  },
  SUBSCRIPTION_PAST_DUE: {
    subject: 'Payment Overdue - Action Required',
    template: 'subscriptionPastDue'
  },
  SUBSCRIPTION_INCOMPLETE: {
    subject: 'Complete Your Subscription',
    template: 'subscriptionIncomplete'
  }
};

/**
 * Send multi-channel notification for billing event
 * Sends: Email (SendGrid) + SMS (Twilio) + In-App (Database)
 */
export async function notifyBillingEvent(userId, issueType, additionalData = {}) {
  try {
    if (!notificationTemplates[issueType]) {
      logErrorFromCatch(
        new Error(`Unknown issue type: ${issueType}`),
        'app',
        'billing-notifications',
        userId
      );
      return { success: false, error: 'Unknown issue type' };
    }

    // Get user contact information
    const userInfo = await getUserContactInfo(userId);
    if (!userInfo) {
      logErrorFromCatch(
        new Error(`User not found: ${userId}`),
        'app',
        'billing-notifications',
        userId
      );
      return { success: false, error: 'User not found' };
    }

    const template = notificationTemplates[issueType];
    const stripePortalLink = additionalData.stripePortalLink || 'https://billing.stripe.com/';

    // Send email
    try {
      const emailHtml = buildEmailHTML(template.template, {
        issueType,
        stripePortalLink,
        ...additionalData
      });

      const msg = {
        to: userInfo.email,
        from: fromEmail,
        subject: template.subject,
        html: emailHtml
      };

      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send(msg);
      }
    } catch (emailError) {
      logErrorFromCatch(emailError, 'app', 'billing-email-notification', userId);
      // Continue with SMS even if email fails
    }

    // Send SMS if phone exists
    if (userInfo.phone_number) {
      try {
        const smsMessages = {
          PAYMENT_FAILED: `Your Starship Psychics payment failed. Please update your payment method: ${stripePortalLink}`,
          SUBSCRIPTION_CANCELLED: `Your Starship Psychics subscription has been cancelled. Reactivate anytime: ${stripePortalLink}`,
          PAYMENT_METHOD_INVALID: `Your Starship Psychics payment method has expired. Please update it: ${stripePortalLink}`,
          SUBSCRIPTION_PAST_DUE: `Your Starship Psychics payment is overdue. Please update your payment method: ${stripePortalLink}`,
          SUBSCRIPTION_INCOMPLETE: `Your Starship Psychics subscription setup is incomplete. Complete it now: ${stripePortalLink}`
        };

        await sendSMS(userInfo.phone_number, smsMessages[issueType]);
      } catch (smsError) {
        logErrorFromCatch(smsError, 'app', 'billing-sms-notification', userId);
        // Continue with in-app even if SMS fails
      }
    }

    // Store in-app notification
    try {
      await storeInAppNotification(userId, issueType);
    } catch (inAppError) {
      logErrorFromCatch(inAppError, 'app', 'billing-inapp-notification', userId);
      // Don't fail the overall operation if in-app notification fails
    }

    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'billing-notifications', userId);
    return { success: false, error: error.message };
  }
}

/**
 * Get user contact info (email and phone)
 * Decrypts encrypted fields
 */
async function getUserContactInfo(userId) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    const query = `SELECT 
      pgp_sym_decrypt(email_encrypted, $1) as email,
      pgp_sym_decrypt(phone_number_encrypted, $2) as phone_number
      FROM user_personal_info
      WHERE user_id = $3`;

    const result = await db.query(query, [
      process.env.ENCRYPTION_KEY,
      process.env.ENCRYPTION_KEY,
      userId
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      email: result.rows[0].email,
      phone_number: result.rows[0].phone_number
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'get-user-contact', userId);
    return null;
  }
}

/**
 * Build email HTML for billing notifications
 */
function buildEmailHTML(template, data) {
  const baseStyles = 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;';
  const contentStyles = 'background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
  const buttonStyles = 'display: inline-block; padding: 12px 40px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;';
  const footerStyles = 'color: #999; font-size: 12px; text-align: center; margin-top: 20px;';

  const templates = {
    paymentFailed: `
      <div style="${baseStyles}">
        <div style="${contentStyles}">
          <h1 style="color: #e74c3c; text-align: center; margin-top: 0;">Payment Failed</h1>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Your recent payment for your Starship Psychics subscription failed. Please update your payment method to continue using the app.</p>
          ${data.amount ? `<p style="font-size: 16px; color: #333; line-height: 1.6;"><strong>Amount:</strong> ${data.currency?.toUpperCase() || 'USD'} ${(data.amount / 100).toFixed(2)}</p>` : ''}
          <div style="margin: 30px 0; text-align: center;">
            <a href="${data.stripePortalLink}" style="${buttonStyles}">Update Payment Method</a>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">If you continue to experience issues, please contact our support team.</p>
          <div style="${footerStyles}">
            <p>Starship Psychics - Your Personal Astrology Guide<br><em>Secure & Confidential</em></p>
          </div>
        </div>
      </div>
    `,
    subscriptionCancelled: `
      <div style="${baseStyles}">
        <div style="${contentStyles}">
          <h1 style="color: #f39c12; text-align: center; margin-top: 0;">Subscription Cancelled</h1>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Your Starship Psychics subscription has been cancelled. You will lose access to premium features at the end of your billing period.</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">You can reactivate your subscription anytime through your account settings or the link below.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${data.stripePortalLink}" style="${buttonStyles}">Reactivate Subscription</a>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">We'd love to have you back! If you have any questions, please reach out to our support team.</p>
          <div style="${footerStyles}">
            <p>Starship Psychics - Your Personal Astrology Guide<br><em>Secure & Confidential</em></p>
          </div>
        </div>
      </div>
    `,
    paymentMethodInvalid: `
      <div style="${baseStyles}">
        <div style="${contentStyles}">
          <h1 style="color: #e74c3c; text-align: center; margin-top: 0;">Update Payment Method</h1>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Your payment method on file has expired or is invalid. Please update it to maintain your Starship Psychics subscription.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${data.stripePortalLink}" style="${buttonStyles}">Update Payment Method</a>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">Without a valid payment method, your subscription may be cancelled. Please update your information as soon as possible.</p>
          <div style="${footerStyles}">
            <p>Starship Psychics - Your Personal Astrology Guide<br><em>Secure & Confidential</em></p>
          </div>
        </div>
      </div>
    `,
    subscriptionPastDue: `
      <div style="${baseStyles}">
        <div style="${contentStyles}">
          <h1 style="color: #e74c3c; text-align: center; margin-top: 0;">Payment Overdue</h1>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Your subscription payment is overdue. Please update your payment method immediately to avoid service interruption.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${data.stripePortalLink}" style="${buttonStyles}">Update Payment Now</a>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">We've made several attempts to charge your payment method. Please take action now to restore your access.</p>
          <div style="${footerStyles}">
            <p>Starship Psychics - Your Personal Astrology Guide<br><em>Secure & Confidential</em></p>
          </div>
        </div>
      </div>
    `,
    subscriptionIncomplete: `
      <div style="${baseStyles}">
        <div style="${contentStyles}">
          <h1 style="color: #f39c12; text-align: center; margin-top: 0;">Complete Your Subscription</h1>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Your subscription setup is incomplete. Please complete the payment to activate your account.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${data.stripePortalLink}" style="${buttonStyles}">Complete Setup</a>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">Your subscription setup needs to be completed to access Starship Psychics premium features.</p>
          <div style="${footerStyles}">
            <p>Starship Psychics - Your Personal Astrology Guide<br><em>Secure & Confidential</em></p>
          </div>
        </div>
      </div>
    `
  };

  return templates[template] || templates.subscriptionIncomplete;
}

/**
 * Store in-app notification in database
 */
async function storeInAppNotification(userId, issueType) {
  try {
    const query = `
      INSERT INTO error_logs (service, error_message, severity, context)
      VALUES ('billing-notification', $1, $2, $3)
    `;

    const messages = {
      PAYMENT_FAILED: 'Your payment failed. Please update your payment method.',
      SUBSCRIPTION_CANCELLED: 'Your subscription has been cancelled.',
      PAYMENT_METHOD_INVALID: 'Your payment method is invalid or expired.',
      SUBSCRIPTION_PAST_DUE: 'Your subscription payment is overdue.',
      SUBSCRIPTION_INCOMPLETE: 'Your subscription setup is incomplete.'
    };

    await db.query(query, [
      messages[issueType] || 'Subscription issue detected',
      'warning',
      JSON.stringify({
        type: issueType,
        userId: userId
      })
    ]);

    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'store-inapp-notification', userId);
    throw error;
  }
}

/**
 * Notify user when subscription check fails
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

    // Send email notification
    try {
      const msg = {
        to: userInfo.email,
        from: fromEmail,
        subject: 'Subscription Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: #fff; border-radius: 8px; padding: 30px;">
              <h1 style="color: #3498db; text-align: center;">Subscription Verification</h1>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">${message}</p>
              <p style="font-size: 14px; color: #666; line-height: 1.6;">If you continue to experience issues, please log in to your account and check your subscription status.</p>
              <div style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                <p>Starship Psychics - Your Personal Astrology Guide</p>
              </div>
            </div>
          </div>
        `
      };

      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send(msg);
      }
    } catch (error) {
      logErrorFromCatch(error, 'app', 'subscription-check-email', userId);
    }

    // Send SMS
    if (userInfo.phone_number) {
      try {
        await sendSMS(userInfo.phone_number, `Starship Psychics: ${message}`);
      } catch (error) {
        logErrorFromCatch(error, 'app', 'subscription-check-sms', userId);
      }
    }
  } catch (error) {
    logErrorFromCatch(error, 'app', 'notify-subscription-check-failed', userId);
  }
}

/**
 * Notify user that their subscription is about to expire
 */
export async function notifySubscriptionExpiring(userId, daysRemaining) {
  try {
    const userInfo = await getUserContactInfo(userId);
    if (!userInfo) return;

    const message = `Your subscription expires in ${daysRemaining} days. Renew now to avoid service interruption.`;

    // Send email
    try {
      const msg = {
        to: userInfo.email,
        from: fromEmail,
        subject: `Your Subscription Expires in ${daysRemaining} Days`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: #fff; border-radius: 8px; padding: 30px;">
              <h1 style="color: #f39c12; text-align: center;">Subscription Expiring Soon</h1>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">${message}</p>
              <p style="font-size: 14px; color: #666; line-height: 1.6;">Renew your subscription to continue enjoying unlimited access to all premium features.</p>
              <div style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                <p>Starship Psychics - Your Personal Astrology Guide</p>
              </div>
            </div>
          </div>
        `
      };

      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send(msg);
      }
    } catch (error) {
      logErrorFromCatch(error, 'app', 'subscription-expiring-email', userId);
    }

    // Send SMS
    if (userInfo.phone_number) {
      try {
        await sendSMS(userInfo.phone_number, `Starship Psychics: ${message}`);
      } catch (error) {
        logErrorFromCatch(error, 'app', 'subscription-expiring-sms', userId);
      }
    }
  } catch (error) {
    logErrorFromCatch(error, 'app', 'notify-subscription-expiring', userId);
  }
}

export default {
  notifyBillingEvent,
  notifySubscriptionCheckFailed,
  notifySubscriptionExpiring
};
