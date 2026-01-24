/**
 * Notification Orchestrator
 * Handles multi-channel notifications (Email + SMS + In-App)
 * Centralizes the pattern of sending notifications across all channels
 */
import { sendEmail } from '../../shared/email/emailSender.js';
import { sendSMS } from '../../shared/smsService.js';
import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { getUserContactInfo } from '../user/userContactService.js';

/**
 * Send multi-channel notification
 * Sends email, SMS (if phone available), and stores in-app notification
 * @param {Object} options - Notification options
 * @param {string} options.userId - User ID
 * @param {Object} options.email - Email notification data
 * @param {string} options.email.subject - Email subject
 * @param {string} options.email.html - Email HTML content
 * @param {string} options.sms - SMS message text
 * @param {Object} options.inApp - In-app notification data
 * @param {string} options.inApp.message - In-app notification message
 * @param {string} options.inApp.severity - Severity level (info, warning, error)
 * @param {Object} [options.inApp.context] - Additional context data
 * @returns {Promise<Object>} Notification results
 */
export async function sendMultiChannelNotification(options) {
  const { userId, email, sms, inApp } = options;
  const results = {
    success: true,
    email: { sent: false, error: null },
    sms: { sent: false, error: null },
    inApp: { stored: false, error: null }
  };

  try {
    // Get user contact information
    const userInfo = await getUserContactInfo(userId);
    if (!userInfo) {
      return {
        success: false,
        error: 'User not found',
        email: { sent: false, error: 'User not found' },
        sms: { sent: false, error: 'User not found' },
        inApp: { stored: false, error: 'User not found' }
      };
    }

    // Send email
    if (email) {
      try {
        const emailResult = await sendEmail({
          to: userInfo.email,
          subject: email.subject,
          html: email.html
        });

        if (emailResult.success) {
          results.email.sent = true;
        } else {
          results.email.error = emailResult.error;
        }
      } catch (emailError) {
        results.email.error = emailError.message;
        logErrorFromCatch(emailError, 'app', 'multi-channel-email', userId);
      }
    }

    // Send SMS if phone exists
    if (sms && userInfo.phone_number) {
      try {
        await sendSMS(userInfo.phone_number, sms);
        results.sms.sent = true;
      } catch (smsError) {
        results.sms.error = smsError.message;
        logErrorFromCatch(smsError, 'app', 'multi-channel-sms', userId);
      }
    }

    // Store in-app notification
    if (inApp) {
      try {
        await storeInAppNotification(userId, inApp.message, inApp.severity || 'warning', inApp.context);
        results.inApp.stored = true;
      } catch (inAppError) {
        results.inApp.error = inAppError.message;
        logErrorFromCatch(inAppError, 'app', 'multi-channel-inapp', userId);
      }
    }

    return results;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'multi-channel-notification', userId);
    return {
      success: false,
      error: error.message,
      email: { sent: false, error: error.message },
      sms: { sent: false, error: error.message },
      inApp: { stored: false, error: error.message }
    };
  }
}

/**
 * Store in-app notification in database
 * @param {string} userId - User ID
 * @param {string} message - Notification message
 * @param {string} severity - Severity level (info, warning, error)
 * @param {Object} [context] - Additional context data
 * @returns {Promise<void>}
 */
async function storeInAppNotification(userId, message, severity = 'warning', context = {}) {
  try {
    const query = `
      INSERT INTO error_logs (service, error_message, severity, context)
      VALUES ('billing-notification', $1, $2, $3)
    `;

    await db.query(query, [
      message,
      severity,
      JSON.stringify({
        ...context,
        userId: userId
      })
    ]);
  } catch (error) {
    logErrorFromCatch(error, 'app', 'store-inapp-notification', userId);
    throw error;
  }
}
