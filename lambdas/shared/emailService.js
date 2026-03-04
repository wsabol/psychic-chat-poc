/**
 * Email Service for Lambda Functions  — public API surface
 *
 * Thin orchestration layer that composes the focused sub-modules under
 * lambdas/shared/email/ into the three sending functions consumed by every
 * Lambda job.  Import paths for all callers remain unchanged.
 *
 * ─── Module map ───────────────────────────────────────────────────────────
 *   email/config.js                    Brand config + Stripe status maps
 *   email/htmlHelpers.js               Locale-independent HTML primitives
 *   email/sender.js                    SendGrid client + core sendEmail()
 *   email/optOut.js                    isEmailOptedOut / recordEmailUnsubscribe
 *   email/templates/reengagement.js              buildReengagementEmail()
 *   email/templates/subscriptionNotification.js  buildSubscriptionNotificationEmail()
 *   email/templates/policyReminder.js            buildPolicyReminderEmail()
 * ──────────────────────────────────────────────────────────────────────────
 *
 * ─── Adding a new language ────────────────────────────────────────────────
 *   1.  Create  api/shared/email/i18n/<locale>.js  (copy en-US.js as template)
 *   2.  Register it in api/shared/email/i18n/index.js  (one line)
 *   Done — both the API and every Lambda pick it up automatically.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * ─── Adding a new email type ──────────────────────────────────────────────
 *   1.  Add i18n strings to api/shared/email/i18n/<locale>.js files
 *   2.  Create  lambdas/shared/email/templates/<name>.js
 *   3.  Add a public send function below (follow the pattern of the three
 *       existing functions — opt-out check, build, send).
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Opt-out strategy:
 *   user_settings.email_marketing_enabled = false  →  skip non-critical emails.
 *   Rows missing from user_settings are treated as opted-IN (COALESCE default).
 *
 * Exported functions:
 *   isEmailOptedOut(userIdHash, db)
 *   recordEmailUnsubscribe(userIdHash, db)
 *   sendReengagementEmail(to, userId, userIdHash, emailType, db, locale?)
 *   sendSubscriptionNotificationEmail(to, userIdHash, status, stripePortalLink, db, locale?)
 *   sendPolicyReminderEmail(to, userIdHash, gracePeriodEnd, documentType, description, isReminder, db, locale?)
 */

// ─── Infrastructure ──────────────────────────────────────────────────────────
export { isEmailOptedOut, recordEmailUnsubscribe } from './email/optOut.js';
import { isEmailOptedOut, recordEmailUnsubscribe } from './email/optOut.js';
import { sendEmail }                                from './email/sender.js';

// ─── Template builders ───────────────────────────────────────────────────────
import { buildReengagementEmail }           from './email/templates/reengagement.js';
import { buildSubscriptionNotificationEmail } from './email/templates/subscriptionNotification.js';
import { buildPolicyReminderEmail }          from './email/templates/policyReminder.js';

// i18n helper — needed only for SendGrid unsubscribe-tracking text
import { getEmailSection, resolveLocale } from './i18n/index.js';

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
 * @param {object}             db          Lambda DB helper
 * @param {string}             [locale]
 */
export async function sendReengagementEmail(to, userId, userIdHash, emailType, db, locale = 'en-US') {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) return { success: false, skipped: true, reason: 'email_opted_out' };

  const resolved          = resolveLocale(locale);
  const s                 = getEmailSection(resolved, 'reengagement');
  const { subject, html } = buildReengagementEmail(userId, emailType, resolved);

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
 * @param {string|null} stripePortalLink Stripe portal URL (null → falls back to /billing)
 * @param {object}      db
 * @param {string}      [locale]
 */
export async function sendSubscriptionNotificationEmail(
  to, userIdHash, status, stripePortalLink, db, locale = 'en-US'
) {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) return { success: false, skipped: true, reason: 'email_opted_out' };

  const { subject, html } = buildSubscriptionNotificationEmail(status, stripePortalLink, locale);
  return sendEmail({ to, subject, html });
}

/**
 * Send a policy change notice or reminder email.
 *
 * @param {string}      to             Recipient email
 * @param {string}      userIdHash     SHA-256 hex hash
 * @param {Date|string} gracePeriodEnd Grace period deadline
 * @param {string}      documentType   'terms' | 'privacy' | 'both'
 * @param {string}      description    Human-readable description of what changed
 * @param {boolean}     isReminder     true = reminder, false = initial notice
 * @param {object}      db
 * @param {string}      [locale]
 */
export async function sendPolicyReminderEmail(
  to, userIdHash, gracePeriodEnd, documentType, description, isReminder, db, locale = 'en-US'
) {
  const optedOut = await isEmailOptedOut(userIdHash, db);
  if (optedOut) return { success: false, skipped: true, reason: 'email_opted_out' };

  const { subject, html } = buildPolicyReminderEmail(
    gracePeriodEnd, documentType, description, isReminder, locale
  );

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
