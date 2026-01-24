/**
 * Email Service - Refactored modular architecture
 * Main entry point providing backward-compatible API
 */

import { sendEmail } from './emailSender.js';
import { generateVerificationEmail, verificationEmailSubject } from './templates/verificationEmail.js';
import { generatePasswordResetEmail, passwordResetEmailSubject } from './templates/passwordResetEmail.js';
import { generateTwoFactorEmail, twoFactorEmailSubject } from './templates/twoFactorEmail.js';
import { generateReengagementEmail } from './templates/reengagementEmail.js';
import { generatePolicyChangeEmail } from './templates/policyChangeEmail.js';

/**
 * Send email verification email
 * @param {string} userEmail - User's email address
 * @param {string} verificationCode - Verification code
 * @returns {Promise<Object>} Send result
 */
export async function sendEmailVerification(userEmail, verificationCode) {
    const html = generateVerificationEmail({ code: verificationCode });
    return await sendEmail({
        to: userEmail,
        subject: verificationEmailSubject,
        html
    });
}

/**
 * Send password reset email with code
 * @param {string} userEmail - User's email address
 * @param {string} resetCode - Password reset code
 * @returns {Promise<Object>} Send result
 */
export async function sendPasswordResetEmail(userEmail, resetCode) {
    const html = generatePasswordResetEmail({ code: resetCode });
    return await sendEmail({
        to: userEmail,
        subject: passwordResetEmailSubject,
        html
    });
}

/**
 * Send email verification code (generic verification)
 * @param {string} userEmail - User's email address
 * @param {string} code - Verification code
 * @returns {Promise<Object>} Send result
 */
export async function sendEmailVerificationCode(userEmail, code) {
    const html = generateVerificationEmail({ code });
    return await sendEmail({
        to: userEmail,
        subject: 'Verification Code - Psychic Chat',
        html
    });
}

/**
 * Send 2FA code via email
 * @param {string} userEmail - User's email address
 * @param {string} code - 2FA code
 * @returns {Promise<Object>} Send result
 */
export async function send2FACodeEmail(userEmail, code) {
    const html = generateTwoFactorEmail({ code });
    return await sendEmail({
        to: userEmail,
        subject: twoFactorEmailSubject,
        html
    });
}

/**
 * Send account re-engagement email to users with deleted accounts
 * @param {string} userEmail - User's email address
 * @param {string} userId - User ID
 * @param {string} emailType - '6_month' or '12_month'
 * @returns {Promise<Object>} Send result
 */
export async function sendAccountReengagementEmail(userEmail, userId, emailType) {
    const emailContent = generateReengagementEmail({ userId, emailType });
    return await sendEmail({
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        trackingSettings: emailContent.trackingSettings
    });
}

/**
 * Send policy change notification email
 * @param {string} userEmail - User's email address
 * @param {Object} changeInfo - Policy change information
 * @param {string} changeInfo.documentType - 'terms' | 'privacy' | 'both'
 * @param {string} changeInfo.version - New version number
 * @param {string} changeInfo.changeType - 'MAJOR' | 'MINOR'
 * @param {string} changeInfo.description - Description of changes
 * @param {Date} changeInfo.gracePeriodEnd - Deadline to accept
 * @param {boolean} isReminder - Whether this is a reminder email
 * @returns {Promise<Object>} Send result
 */
export async function sendPolicyChangeNotification(userEmail, changeInfo, isReminder = false) {
    const emailContent = generatePolicyChangeEmail({ ...changeInfo, isReminder });
    
    const result = await sendEmail({
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        trackingSettings: emailContent.trackingSettings
    });
    
    // Add emailType to result for compatibility
    if (result.success) {
        result.emailType = emailContent.emailType;
    }
    
    return result;
}

// Re-export utilities for advanced use cases
export { sendEmail } from './emailSender.js';
export { EMAIL_CONFIG } from './config.js';
export { generateReactivationToken, verifyReactivationToken } from './utils/tokenGenerator.js';
