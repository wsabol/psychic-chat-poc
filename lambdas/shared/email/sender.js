/**
 * Core SendGrid Send Helper
 *
 * Owns the SendGrid client lifecycle and the single low-level send function.
 * Nothing in here is template- or email-type-specific.
 *
 * Exports:
 *   sendEmail({ to, subject, html, trackingSettings? })
 *     → Promise<{ success, messageId? } | { success: false, error }>
 */

import sgMail from '@sendgrid/mail';
import { createLogger } from '../errorLogger.js';
import { CONFIG } from './config.js';

const logger = createLogger('email-sender');

// Initialise SendGrid lazily (once per Lambda container lifetime).
let _sendGridReady = false;

function ensureSendGrid() {
  if (_sendGridReady) return true;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  sgMail.setApiKey(key);
  _sendGridReady = true;
  return true;
}

/**
 * Send a single email via SendGrid.
 *
 * @param {object}  opts
 * @param {string}  opts.to                  Recipient address
 * @param {string}  opts.subject
 * @param {string}  opts.html                Full HTML body
 * @param {object}  [opts.trackingSettings]  SendGrid tracking overrides
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, html, trackingSettings }) {
  if (!ensureSendGrid()) {
    const msg = 'SENDGRID_API_KEY is not configured';
    logger.error(new Error(msg), 'sendEmail');
    return { success: false, error: msg };
  }

  try {
    const msg = { to, from: CONFIG.fromEmail, subject, html };
    if (trackingSettings) msg.trackingSettings = trackingSettings;

    const [response] = await sgMail.send(msg);
    return {
      success:   true,
      messageId: response?.headers?.['x-message-id'] ?? 'unknown',
    };
  } catch (err) {
    logger.errorFromCatch(err, 'sendEmail', to);
    return { success: false, error: err.message ?? 'Unknown SendGrid error' };
  }
}
