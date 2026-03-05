/**
 * Email Service — Main entry point
 *
 * All public send functions now accept an optional `locale` parameter
 * (e.g. 'en-US', 'es-ES', 'fr-FR') that is passed through to the template
 * generator so the email is rendered in the user's preferred language.
 *
 * Locale defaults to 'en-US' everywhere, so existing callers that don't
 * yet pass a locale continue to work without any changes.
 *
 * Locale strings are loaded from static JSON-style JS modules at startup —
 * zero per-email runtime overhead, no translation API calls.
 */

import { sendEmail } from './emailSender.js';
import { generateVerificationEmail }    from './templates/verificationEmail.js';
import { generatePasswordResetEmail }   from './templates/passwordResetEmail.js';
import { generateTwoFactorEmail }       from './templates/twoFactorEmail.js';
import { generateReengagementEmail }    from './templates/reengagementEmail.js';
import { generatePolicyChangeEmail }    from './templates/policyChangeEmail.js';

// ─── Auth / verification emails ──────────────────────────────────────────────

/**
 * Send email verification email
 * @param {string} userEmail
 * @param {string} verificationCode
 * @param {string} [locale='en-US']
 */
export async function sendEmailVerification(userEmail, verificationCode, locale = 'en-US') {
    const { subject, html } = generateVerificationEmail({ code: verificationCode, locale });
    return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send password reset email with code
 * @param {string} userEmail
 * @param {string} resetCode
 * @param {string} [locale='en-US']
 */
export async function sendPasswordResetEmail(userEmail, resetCode, locale = 'en-US') {
    const { subject, html } = generatePasswordResetEmail({ code: resetCode, locale });
    return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send generic email verification code
 * @param {string} userEmail
 * @param {string} code
 * @param {string} [locale='en-US']
 */
export async function sendEmailVerificationCode(userEmail, code, locale = 'en-US') {
    const { subject, html } = generateVerificationEmail({ code, locale });
    return sendEmail({ to: userEmail, subject, html });
}

/**
 * Send 2FA code via email
 * @param {string} userEmail
 * @param {string} code
 * @param {string} [locale='en-US']
 * @param {string|null} [magicLink] - Optional one-click verify URL to embed in the email
 */
export async function send2FACodeEmail(userEmail, code, locale = 'en-US', magicLink = null) {
    const { subject, html } = generateTwoFactorEmail({ code, locale, magicLink });
    return sendEmail({ to: userEmail, subject, html });
}

// ─── Lifecycle / marketing emails ────────────────────────────────────────────

/**
 * Send account re-engagement email to users with deleted accounts
 * @param {string} userEmail
 * @param {string} userId
 * @param {string} emailType - '6_month' or '12_month'
 * @param {string} [locale='en-US']
 */
export async function sendAccountReengagementEmail(userEmail, userId, emailType, locale = 'en-US') {
    const emailContent = generateReengagementEmail({ userId, emailType, locale });
    return sendEmail({
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        trackingSettings: emailContent.trackingSettings,
    });
}

/**
 * Send policy change notification email
 * @param {string} userEmail
 * @param {Object} changeInfo
 * @param {string} changeInfo.documentType - 'terms' | 'privacy' | 'both'
 * @param {string} changeInfo.version
 * @param {string} changeInfo.changeType - 'MAJOR' | 'MINOR'
 * @param {string} changeInfo.description
 * @param {Date}   changeInfo.gracePeriodEnd
 * @param {boolean} [isReminder=false]
 * @param {string} [locale='en-US']
 */
export async function sendPolicyChangeNotification(userEmail, changeInfo, isReminder = false, locale = 'en-US') {
    const emailContent = generatePolicyChangeEmail({ ...changeInfo, isReminder, locale });

    const result = await sendEmail({
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        trackingSettings: emailContent.trackingSettings,
    });

    if (result.success) {
        result.emailType = emailContent.emailType;
    }

    return result;
}

// ─── Billing notification generators (re-exported for callers that build
//     their own send() call — locale is accepted in the data object)  ─────────
export { generatePaymentFailedEmail }         from './templates/paymentFailedEmail.js';
export { generateSubscriptionCancelledEmail } from './templates/subscriptionCancelledEmail.js';
export { generatePaymentMethodInvalidEmail }  from './templates/paymentMethodInvalidEmail.js';
export { generateSubscriptionPastDueEmail }   from './templates/subscriptionPastDueEmail.js';
export { generateSubscriptionIncompleteEmail }from './templates/subscriptionIncompleteEmail.js';
export { generateSubscriptionCheckFailedEmail}from './templates/subscriptionCheckFailedEmail.js';
export { generateSubscriptionExpiringEmail }  from './templates/subscriptionExpiringEmail.js';
export { generatePriceChangeEmail }           from './templates/priceChangeEmail.js';

// ─── Core utilities ───────────────────────────────────────────────────────────
export { sendEmail }                                        from './emailSender.js';
export { EMAIL_CONFIG }                                     from './config.js';
export { generateReactivationToken, verifyReactivationToken } from './utils/tokenGenerator.js';
