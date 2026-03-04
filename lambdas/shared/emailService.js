/**
 * Email Service for Lambda Functions
 *
 * Provides SendGrid-based email sending for all scheduled Lambda jobs.
 * Self-contained so Lambdas have no dependency on the API codebase at
 * runtime, but shares the canonical i18n string catalog via a thin shim
 * at lambdas/shared/i18n/index.js.
 *
 * ─── Adding a new language ────────────────────────────────────────────────
 *   1.  Create  api/shared/email/i18n/<locale>.js  (copy en-US.js as template)
 *   2.  Register it in api/shared/email/i18n/index.js  (one line)
 *   That's it — both the API and every Lambda pick it up automatically.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Opt-out strategy:
 *   user_settings.email_marketing_enabled = false  →  skip non-critical emails.
 *   Rows missing from user_settings are treated as opted-IN (COALESCE default).
 *
 * Exported functions:
 *   isEmailOptedOut(userIdHash, db)
 *   recordEmailUnsubscribe(userIdHash, db)
 *   sendReengagementEmail(to, userId, userIdHash, emailType, db, locale)
 *   sendSubscriptionNotificationEmail(to, userIdHash, status, stripePortalLink, db, locale)
 *   sendPolicyReminderEmail(to, userIdHash, gracePeriodEnd, documentType, description, isReminder, db, locale)
 */

import sgMail from '@sendgrid/mail';
import { createLogger } from './errorLogger.js';
import { getEmailSection, t, resolveLocale } from './i18n/index.js';

const logger = createLogger('email-service');

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────

const CONFIG = {
  fromEmail:    process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com',
  appBaseUrl:   process.env.APP_BASE_URL        || 'https://app.starshippsychics.com',
  supportEmail: 'support@starshippsychics.com',
  brandName:    'Starship Psychics',
  // Design tokens — locale-independent
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

// Color map for Stripe subscription statuses (design tokens, not translated)
const SUBSCRIPTION_STATUS_COLORS = {
  past_due:   CONFIG.colors.warning,
  canceled:   CONFIG.colors.primary,
  incomplete: CONFIG.colors.warning,
  unpaid:     CONFIG.colors.danger,
};

// Map Stripe status strings → i18n section keys (in api/shared/email/i18n/)
const SUBSCRIPTION_STATUS_TO_SECTION = {
  past_due:   'subscriptionPastDue',
  canceled:   'subscriptionCancelled',
  incomplete: 'subscriptionIncomplete',
  unpaid:     'subscriptionPastDue', // closest semantic match; add own section when needed
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
 * @param {string} userIdHash  SHA-256 hex hash of the user's ID
 * @param {Object} db          Lambda db helper (lambdas/shared/db.js)
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
    if (rows.length === 0) return false;
    return rows[0].email_marketing_enabled === false;
  } catch (err) {
    logger.errorFromCatch(err, 'isEmailOptedOut', userIdHash);
    return false; // Fail-open: don't silently drop emails on DB errors
  }
}

/**
 * Persist an unsubscribe event (upsert).
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
       DO UPDATE SET email_marketing_enabled = false, updated_at = NOW()`,
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
 * @param {{ to, subject, html, trackingSettings? }} opts
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
//  HTML PRIMITIVES  (locale-independent)
// ─────────────────────────────────────────────

const C = CONFIG.colors;

function wrapInBase(content, lang = 'en') {
  return `<!DOCTYPE html>
<html lang="${lang}">
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

/** Standard opt-out footer for lifecycle / marketing emails */
const optOutFooter = (unsubscribeText, unsubscribeUrl) => {
  const unsubLink = unsubscribeUrl
    ? `<br>Or <a href="${unsubscribeUrl}" style="color:${C.primary};text-decoration:none;">${unsubscribeText ?? 'unsubscribe'}</a>.`
    : '';
  return `<div style="margin-top:30px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
    <p style="font-size:12px;color:#999;line-height:1.6;">
      You're receiving this because you have an account with ${CONFIG.brandName}.<br>
      To update your preferences, visit your
      <a href="${CONFIG.appBaseUrl}/settings" style="color:${C.primary};text-decoration:none;">account settings</a>.
      ${unsubLink}
    </p>
  </div>`;
};

/** Minimal footer for transactional (billing) emails */
const transactionalFooter = () =>
  `<div style="margin-top:30px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
    <p style="font-size:12px;color:#999;line-height:1.6;">
      This is a service notification about your ${CONFIG.brandName} subscription.<br>
      Questions? <a href="mailto:${CONFIG.supportEmail}" style="color:${C.primary};text-decoration:none;">${CONFIG.supportEmail}</a>.
    </p>
   </div>`;

// ─────────────────────────────────────────────
//  TEMPLATE BUILDERS  (all locale-aware, all string-free)
// ─────────────────────────────────────────────

function buildReengagementEmail(userId, emailType, locale = 'en-US') {
  const resolved     = resolveLocale(locale);
  const s            = getEmailSection(resolved, 'reengagement');
  const is6Month     = emailType === '6_month';
  const reactivateUrl = `${CONFIG.appBaseUrl}/reactivate?userId=${encodeURIComponent(userId)}`;
  const unsubscribeUrl = `${CONFIG.appBaseUrl}/unsubscribe-reengagement?userId=${encodeURIComponent(userId)}`;

  const lang = resolved.split('-')[0]; // 'en', 'es', 'fr', etc.

  const html = wrapInBase(`
    <h1 style="color:${C.primary};text-align:center;margin-top:0;">
      ${is6Month ? s.headline6Month : s.headline12Month}
    </h1>
    ${para(is6Month ? s.message6Month : s.message12Month)}
    ${btn(s.buttonText, reactivateUrl)}
    ${para(s.note, '14px')}
    ${optOutFooter(s.unsubscribeText, unsubscribeUrl)}
  `, lang);

  return {
    subject: is6Month ? s.subject6Month : s.subject12Month,
    html,
  };
}

function buildSubscriptionNotificationEmail(status, stripePortalLink, locale = 'en-US') {
  const resolved   = resolveLocale(locale);
  const sectionKey = SUBSCRIPTION_STATUS_TO_SECTION[status] ?? 'subscriptionPastDue';
  const s          = getEmailSection(resolved, sectionKey);
  const color      = SUBSCRIPTION_STATUS_COLORS[status] ?? C.warning;
  const portalUrl  = stripePortalLink ?? `${CONFIG.appBaseUrl}/billing`;
  const lang       = resolved.split('-')[0];

  // Each section has: subject, headerTitle, body, buttonText, note
  const html = wrapInBase(`
    <h1 style="color:${color};text-align:center;margin-top:0;">${s.headerTitle}</h1>
    ${para(s.body ?? s.body1 ?? '')}
    ${s.body2 ? para(s.body2) : ''}
    ${btn(s.buttonText, portalUrl, color)}
    ${para(s.note, '14px')}
    ${transactionalFooter()}
  `, lang);

  return { subject: s.subject, html };
}

function buildPolicyReminderEmail(gracePeriodEnd, documentType, description, isReminder, locale = 'en-US') {
  const resolved = resolveLocale(locale);
  const s        = getEmailSection(resolved, 'policyChange');
  const lang     = resolved.split('-')[0];

  // Resolve document name from locale strings
  const docName = documentType === 'both'  ? s.docBoth
                : documentType === 'terms' ? s.docTerms
                :                            s.docPrivacy;

  // Format deadline date in user's locale
  const deadline = gracePeriodEnd
    ? new Date(gracePeriodEnd).toLocaleDateString(resolved, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  const daysRemaining = gracePeriodEnd
    ? Math.max(0, Math.ceil((new Date(gracePeriodEnd) - Date.now()) / 86_400_000))
    : 30;

  const headerColor  = isReminder ? C.warning  : C.primary;
  const headerIcon   = isReminder ? s.headerReminder : s.headerInitial;
  const urgencyMsg   = isReminder
    ? t(s.urgencyReminder, { daysRemaining, documentName: docName })
    : t(s.urgencyInitial,  { gracePeriodDate: deadline });

  const intro = isReminder
    ? t(s.introReminder, { documentName: docName })
    : t(s.introInitial,  { documentName: docName });

  const subject = isReminder
    ? t(s.subjectReminder, { documentName: docName })
    : t(s.subjectInitial,  { documentName: docName });

  const loginUrl = `${CONFIG.appBaseUrl}/login`;

  const html = wrapInBase(`
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:28px;">${headerIcon}</span>
    </div>
    <h2 style="color:${C.text};margin-top:0;">${t(s.heading, { documentName: docName })}</h2>
    ${para(intro)}
    ${infoBox(urgencyMsg, headerColor)}
    <h3 style="color:${C.text};">${s.whatChangedTitle}</h3>
    ${para(description || s.defaultDescription)}
    ${btn(s.buttonText, loginUrl)}
    ${warningBox(
      s.deadlineTitle,
      t(s.deadlineBody, { gracePeriodDate: deadline, documentName: docName })
    )}
    <h3 style="color:${C.text};">${s.whatToDoTitle}</h3>
    <ol style="color:${C.text};font-size:15px;line-height:2.2;">
      <li>${s.step1}</li>
      <li>${t(s.step2, { documentName: docName })}</li>
      <li>${s.step3}</li>
    </ol>
    ${optOutFooter()}
  `, lang);

  return { subject, html };
}

// ─────────────────────────────────────────────
//  PUBLIC SENDING FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Send a re-engagement email to a user whose account is pending deletion.
 *
 * @param {string}             to          Recipient email address
 * @param {string}             userId      Raw user ID (used in reactivation link)
 * @param {string}             userIdHash  SHA-256 hex hash (opt-out check)
 * @param {'6_month'|'1_year'} emailType
 * @param {Object}             db          Lambda DB helper
 * @param {string}             [locale='en-US']
 */
export async function sendReengagementEmail(to, userId, userIdHash, emailType, db, locale = 'en-US') {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) return { success: false, skipped: true, reason: 'email_opted_out' };

  const resolved           = resolveLocale(locale);
  const s                  = getEmailSection(resolved, 'reengagement');
  const { subject, html }  = buildReengagementEmail(userId, emailType, resolved);

  return sendEmail({
    to, subject, html,
    trackingSettings: {
      clickTracking:       { enable: true, enableText: true },
      openTracking:        { enable: true },
      unsubscribeTracking: { enable: true, text: s.unsubscribeText },
    },
  });
}

/**
 * Send a subscription status notification email.
 *
 * @param {string}      to               Recipient email
 * @param {string}      userIdHash       SHA-256 hex hash
 * @param {string}      status           Stripe subscription status
 * @param {string|null} stripePortalLink Stripe portal URL (or null → /billing)
 * @param {Object}      db
 * @param {string}      [locale='en-US']
 */
export async function sendSubscriptionNotificationEmail(to, userIdHash, status, stripePortalLink, db, locale = 'en-US') {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) return { success: false, skipped: true, reason: 'email_opted_out' };

  const { subject, html } = buildSubscriptionNotificationEmail(status, stripePortalLink, locale);
  return sendEmail({ to, subject, html });
}

/**
 * Send a policy change or reminder email.
 *
 * @param {string}      to             Recipient email
 * @param {string}      userIdHash     SHA-256 hex hash
 * @param {Date|string} gracePeriodEnd Grace period deadline
 * @param {string}      documentType   'terms' | 'privacy' | 'both'
 * @param {string}      description    Human-readable description of what changed
 * @param {boolean}     isReminder     true = reminder, false = initial notice
 * @param {Object}      db
 * @param {string}      [locale='en-US']
 */
export async function sendPolicyReminderEmail(
  to, userIdHash, gracePeriodEnd, documentType, description, isReminder, db, locale = 'en-US'
) {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) return { success: false, skipped: true, reason: 'email_opted_out' };

  const { subject, html } = buildPolicyReminderEmail(gracePeriodEnd, documentType, description, isReminder, locale);
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
