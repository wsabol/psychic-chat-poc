/**
 * Email Service for Deletion Verification
 * Sends a 6-digit verification code email when a user requests account deletion.
 */

import { sendEmail } from '../../../shared/email/emailSender.js';
import {
  generateAccountDeletionEmail,
} from '../../../shared/email/templates/accountDeletionEmail.js';

/**
 * Send account deletion verification email with a 6-digit code.
 *
 * @param {string} email    - Recipient email address
 * @param {string} code     - 6-digit verification code (10-minute expiry)
 * @param {string} [locale='en-US'] - User's preferred locale
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendDeleteVerificationEmail(email, code, locale = 'en-US') {
  const { subject, html } = generateAccountDeletionEmail({ code, expiryMinutes: 10, locale });
  return sendEmail({ to: email, subject, html });
}

/**
 * Mask an email address for display (e.g. jo***@example.com)
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
