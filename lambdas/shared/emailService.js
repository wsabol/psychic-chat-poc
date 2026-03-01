/**
 * Email Service for Lambda Functions
 *
 * Provides SendGrid-based email sending for all scheduled Lambda jobs.
 * Mirrors the API's api/shared/email architecture but is self-contained
 * so Lambdas have no dependency on the API codebase.
 *
 * Opt-out strategy:
 *   User email preferences are stored in user_settings.email_marketing_enabled.
 *   Setting this to false means the user has opted out of all non-critical emails.
 *   Every outbound email checks this flag before sending.
 *
 * Functions exported:
 *   isEmailOptedOut(userIdHash, db)               – check opt-out status
 *   recordEmailUnsubscribe(userIdHash, db)         – record an unsubscribe
 *   sendReengagementEmail(...)                     – account re-engagement (6m / 1yr)
 *   sendSubscriptionNotificationEmail(...)         – past_due / canceled / etc.
 *   sendPolicyReminderEmail(...)                   – policy change / reminder
 */

import sgMail from '@sendgrid/mail';
import { createLogger } from './errorLogger.js';

const logger = createLogger('email-service');

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────

const CONFIG = {
  fromEmail:    process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com',
  appBaseUrl:   process.env.APP_BASE_URL        || 'https://app.starshippsychics.com',
  supportEmail: 'support@starshippsychics.com',
  brandName:    'Starship Psychics',
  colors: {
    primary:           '#667eea',
    warning:           '#f59e0b',
    danger:            '#ef4444',
    success:           '#10b981',
    text:              '#333333',
    textLight:         '#666666',
    border:            '#dddddd',
    backgroundLight:   '#f5f5f5',
    backgroundWarning: '#fff3cd',
    borderWarning:     '#ffc107',
  },
};

// Initialise SendGrid lazily (once per Lambda container lifetime)
let _sendGridReady = false;
function ensureSendGrid() {
  if (_sendGridReady) return true;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  sgMail.setApiKey(key);
  _sendGridReady = true;
  return true;
}

// ─────────────────────────────────────────────
//  OPT-OUT MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Check whether a user has opted out of email communications.
 *
 * Source of truth: user_settings.email_marketing_enabled
 *   - Row missing  → user has never saved preferences → treat as opted-IN
 *   - false        → user has explicitly opted out → skip sending
 *   - true / null  → opted in
 *
 * @param {string} userIdHash - SHA-256 hex hash of the user's ID
 * @param {Object} db         - Lambda db helper (lambdas/shared/db.js)
 * @returns {Promise<boolean>} true = opted OUT (do not send)
 */
export async function isEmailOptedOut(userIdHash, db) {
  try {
    const { rows } = await db.query(
      `SELECT email_marketing_enabled
         FROM user_settings
        WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (rows.length === 0) return false;              // No record → send
    return rows[0].email_marketing_enabled === false; // Explicit opt-out
  } catch (err) {
    logger.errorFromCatch(err, 'isEmailOptedOut', userIdHash);
    return false; // Fail-open: don't silently drop emails on DB errors
  }
}

/**
 * Persist an unsubscribe event for a user.
 * Sets user_settings.email_marketing_enabled = false (upserts the row).
 *
 * @param {string} userIdHash
 * @param {Object} db
 * @returns {Promise<boolean>} true on success
 */
export async function recordEmailUnsubscribe(userIdHash, db) {
  try {
    await db.query(
      `INSERT INTO user_settings (user_id_hash, email_marketing_enabled, updated_at)
            VALUES ($1, false, NOW())
       ON CONFLICT (user_id_hash)
       DO UPDATE SET email_marketing_enabled = false,
                     updated_at              = NOW()`,
      [userIdHash]
    );
    return true;
  } catch (err) {
    logger.errorFromCatch(err, 'recordEmailUnsubscribe', userIdHash);
    return false;
  }
}

// ─────────────────────────────────────────────
//  CORE SEND HELPER
// ─────────────────────────────────────────────

/**
 * Send an email via SendGrid.
 *
 * @param {Object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {Object} [opts.trackingSettings]
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendEmail({ to, subject, html, trackingSettings }) {
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

// ─────────────────────────────────────────────
//  HTML TEMPLATE HELPERS
// (self-contained; mirrors api/shared/email/templates/ style)
// ─────────────────────────────────────────────

const C = CONFIG.colors;

function wrapInBase(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email from ${CONFIG.brandName}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.backgroundLight};font-family:Arial,sans-serif;">
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:8px;padding:30px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
      ${content}
    </div>
    <p style="text-align:center;font-size:12px;color:#999;margin-top:15px;">
      &copy; ${new Date().getFullYear()} ${CONFIG.brandName}. All rights reserved.
    </p>
  </div>
</body>
</html>`.trim();
}

const para = (text, size = '16px') =>
  `<p style="font-size:${size};color:${C.text};line-height:1.6;margin-bottom:15px;">${text}</p>`;

const btn = (text, url, color = C.primary) =>
  `<div style="text-align:center;margin:25px 0;">
    <a href="${url}"
       style="background-color:${color};color:#fff;padding:12px 30px;text-decoration:none;
              border-radius:5px;font-weight:bold;display:inline-block;">${text}</a>
   </div>`;

const infoBox = (text, color = C.primary) =>
  `<div style="background:#f0f4ff;border-left:4px solid ${color};padding:15px;
               margin:20px 0;border-radius:4px;">
    <p style="margin:0;font-size:14px;color:${C.text};line-height:1.6;">${text}</p>
   </div>`;

const warningBox = (title, body) =>
  `<div style="background:${C.backgroundWarning};border:1px solid ${C.borderWarning};
               border-radius:4px;padding:15px;margin:20px 0;">
    <strong style="color:#856404;">${title}</strong>
    <p style="margin:8px 0 0;font-size:14px;color:#856404;line-height:1.6;">${body}</p>
   </div>`;

/** Standard opt-out footer for marketing / lifecycle emails */
const optOutFooter = () =>
  `<div style="margin-top:30px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
    <p style="font-size:12px;color:#999;line-height:1.6;">
      You're receiving this email because you have an account with ${CONFIG.brandName}.<br>
      To update your email preferences, visit your
      <a href="${CONFIG.appBaseUrl}/settings"
         style="color:${C.primary};text-decoration:none;">account settings</a>.
    </p>
   </div>`;

/** Minimal footer for transactional (billing) emails */
const transactionalFooter = () =>
  `<div style="margin-top:30px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
    <p style="font-size:12px;color:#999;line-height:1.6;">
      This is a service notification about your ${CONFIG.brandName} subscription.<br>
      Questions? Contact us at
      <a href="mailto:${CONFIG.supportEmail}"
         style="color:${C.primary};text-decoration:none;">${CONFIG.supportEmail}</a>.
    </p>
   </div>`;

// ─────────────────────────────────────────────
//  TEMPLATE: Re-engagement
// ─────────────────────────────────────────────

function buildReengagementEmail(userId, emailType) {
  const is6Month      = emailType === '6_month';
  const reactivateUrl = `${CONFIG.appBaseUrl}/reactivate?userId=${encodeURIComponent(userId)}`;

  const headline = is6Month
    ? '💫 We Miss You!'
    : '⚠️ Your Account is About to Be Deleted';

  const message = is6Month
    ? "It's been 6 months since you requested to delete your account. We understand life changes — we'd love to welcome you back whenever you're ready. Your data is safely stored and can be reactivated at any time."
    : "It's been a year since you requested account deletion. This is your final notice before permanent data deletion in 6 months. If you'd like to keep your account active, please reactivate it now.";

  const subject = is6Month
    ? 'We Miss You! Your Starship Psychics Account is Ready to Reactivate'
    : 'Last Chance: Reactivate Your Starship Psychics Account';

  const html = wrapInBase(`
    <h1 style="color:${C.primary};text-align:center;margin-top:0;">${headline}</h1>
    ${para(message)}
    ${btn('Reactivate My Account', reactivateUrl)}
    ${para('Reactivating is quick and easy — all your data will be restored immediately.', '14px')}
    ${optOutFooter()}
  `);

  return { subject, html };
}

// ─────────────────────────────────────────────
//  TEMPLATE: Subscription notification
// ─────────────────────────────────────────────

const SUBSCRIPTION_COPY = {
  past_due: {
    subject:    'Payment Overdue – Action Required',
    headline:   '⚠️ Payment Overdue',
    color:      C.warning,
    message:    'Your subscription payment is overdue. Please update your payment method to avoid losing access to your account.',
    buttonText: 'Update Payment Now',
    note:       "We've made several attempts to process your payment. Please take action now to restore full access.",
  },
  canceled: {
    subject:    'Your Subscription Has Been Cancelled',
    headline:   '📋 Subscription Cancelled',
    color:      C.primary,
    message:    'Your Starship Psychics subscription has been cancelled. You will lose access to premium features at the end of your current billing period.',
    buttonText: 'Reactivate Subscription',
    note:       'You can reactivate your subscription anytime through your account settings.',
  },
  incomplete: {
    subject:    'Action Required: Complete Your Subscription Setup',
    headline:   '⚠️ Subscription Incomplete',
    color:      C.warning,
    message:    'Your subscription setup is incomplete. Please provide payment information to activate your account.',
    buttonText: 'Complete Setup',
    note:       'Your access will remain limited until your subscription is fully set up.',
  },
  unpaid: {
    subject:    'Subscription Suspended – Payment Required',
    headline:   '🚨 Payment Required',
    color:      C.danger,
    message:    'Your subscription has been suspended due to an unpaid invoice. Please update your payment method to restore access.',
    buttonText: 'Pay Now',
    note:       'Your account access has been suspended. Please update your payment information immediately.',
  },
};

function buildSubscriptionNotificationEmail(status, stripePortalLink) {
  const cfg      = SUBSCRIPTION_COPY[status] ?? SUBSCRIPTION_COPY.past_due;
  const portalUrl = stripePortalLink ?? `${CONFIG.appBaseUrl}/billing`;

  const html = wrapInBase(`
    <h1 style="color:${cfg.color};text-align:center;margin-top:0;">${cfg.headline}</h1>
    ${para(cfg.message)}
    ${btn(cfg.buttonText, portalUrl, cfg.color)}
    ${para(cfg.note, '14px')}
    ${transactionalFooter()}
  `);

  return { subject: cfg.subject, html };
}

// ─────────────────────────────────────────────
//  TEMPLATE: Policy reminder
// ─────────────────────────────────────────────

function buildPolicyReminderEmail(gracePeriodEnd, documentType, description, isReminder) {
  const docName = documentType === 'both'
    ? 'Terms of Service and Privacy Policy'
    : documentType === 'terms'
      ? 'Terms of Service'
      : 'Privacy Policy';

  const deadline = gracePeriodEnd
    ? new Date(gracePeriodEnd).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'the grace period deadline';

  const daysLeft = gracePeriodEnd
    ? Math.max(0, Math.ceil((new Date(gracePeriodEnd) - Date.now()) / 86_400_000))
    : 30;

  const headerColor  = isReminder ? C.warning : C.primary;
  const headerIcon   = isReminder ? '⚠️ Reminder' : '📋 Important Update';
  const urgencyMsg   = isReminder
    ? `<strong>⚠️ ${daysLeft} days remaining</strong> – Please log in to review and accept the updated ${docName}.`
    : `You have <strong>30 days</strong> (until ${deadline}) to review and accept these changes.`;

  const subject = isReminder
    ? `Reminder: Action Required – Review Updated ${docName}`
    : `Important: Updates to Our ${docName}`;

  const loginUrl = `${CONFIG.appBaseUrl}/login`;

  const html = wrapInBase(`
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:28px;">${headerIcon}</span>
    </div>
    <h2 style="color:${C.text};margin-top:0;">We've Updated Our ${docName}</h2>
    ${para(`${isReminder ? 'This is a reminder that you' : 'You'} need to review and accept our updated ${docName}.`)}
    ${infoBox(urgencyMsg, headerColor)}
    <h3 style="color:${C.text};">What's Changed?</h3>
    ${para(description || `We've made important updates to better serve you and maintain compliance with current regulations.`)}
    ${btn('Log In to Review & Accept', loginUrl)}
    ${warningBox(
      '⏰ Important Deadline',
      `By <strong>${deadline}</strong>, you must log in and accept the updated ${docName}.
       If you do not accept by this date, you will be automatically logged out and unable to
       access your account until you accept the new terms.`
    )}
    <h3 style="color:${C.text};">What You Need to Do</h3>
    <ol style="color:${C.text};font-size:15px;line-height:2.2;">
      <li>Log in to your Starship Psychics account</li>
      <li>Review the updated ${docName}</li>
      <li>Accept the changes to continue using your account</li>
    </ol>
    ${optOutFooter()}
  `);

  return { subject, html };
}

// ─────────────────────────────────────────────
//  PUBLIC SENDING FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Send a re-engagement email to a user whose account is pending deletion.
 *
 * The SQL query in account-cleanup already filters reengagement_email_unsub = FALSE.
 * This function additionally checks user_settings.email_marketing_enabled.
 *
 * @param {string}          to         Recipient email address
 * @param {string}          userId     Raw user ID (used in reactivation link)
 * @param {string}          userIdHash SHA-256 hex hash (used for opt-out check)
 * @param {'6_month'|'1_year'} emailType
 * @param {Object}          db         Lambda DB helper
 * @returns {Promise<{success: boolean, messageId?: string, skipped?: boolean, reason?: string, error?: string}>}
 */
export async function sendReengagementEmail(to, userId, userIdHash, emailType, db) {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) {
    return { success: false, skipped: true, reason: 'email_opted_out' };
  }

  const { subject, html } = buildReengagementEmail(userId, emailType);
  return sendEmail({
    to, subject, html,
    trackingSettings: {
      clickTracking:       { enable: true, enableText: true },
      openTracking:        { enable: true },
      unsubscribeTracking: { enable: true, text: 'Unsubscribe from re-engagement emails' },
    },
  });
}

/**
 * Send a subscription status notification email.
 *
 * Triggered when Stripe subscription status changes to past_due, canceled,
 * incomplete, or unpaid.  Checks email_marketing_enabled opt-out.
 *
 * @param {string}  to               Recipient email
 * @param {string}  userIdHash       SHA-256 hex hash
 * @param {string}  status           Stripe subscription status
 * @param {string|null} stripePortalLink  Stripe customer portal URL (or null)
 * @param {Object}  db
 */
export async function sendSubscriptionNotificationEmail(to, userIdHash, status, stripePortalLink, db) {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) {
    return { success: false, skipped: true, reason: 'email_opted_out' };
  }

  const { subject, html } = buildSubscriptionNotificationEmail(status, stripePortalLink);
  return sendEmail({ to, subject, html });
}

/**
 * Send a policy change or reminder email.
 *
 * @param {string}        to             Recipient email
 * @param {string}        userIdHash     SHA-256 hex hash
 * @param {Date|string}   gracePeriodEnd Grace period deadline
 * @param {string}        documentType   'terms' | 'privacy' | 'both'
 * @param {string}        description    Human-readable description of what changed
 * @param {boolean}       isReminder     true = reminder email, false = initial notice
 * @param {Object}        db
 */
export async function sendPolicyReminderEmail(
  to, userIdHash, gracePeriodEnd, documentType, description, isReminder, db
) {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) {
    return { success: false, skipped: true, reason: 'email_opted_out' };
  }

  const { subject, html } = buildPolicyReminderEmail(gracePeriodEnd, documentType, description, isReminder);
  return sendEmail({
    to, subject, html,
    trackingSettings: {
      clickTracking: { enable: true, enableText: true },
      openTracking:  { enable: true },
    },
  });
}

export default {
  isEmailOptedOut,
  recordEmailUnsubscribe,
  sendReengagementEmail,
  sendSubscriptionNotificationEmail,
  sendPolicyReminderEmail,
};
