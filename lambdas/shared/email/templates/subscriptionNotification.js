/**
 * Subscription Notification Email Template
 *
 * Builds the HTML and subject line for Stripe subscription status change emails
 * (past_due, canceled, incomplete, unpaid).
 *
 * Export:
 *   buildSubscriptionNotificationEmail(status, stripePortalLink?, locale?) → { subject, html }
 */

import { CONFIG, SUBSCRIPTION_STATUS_COLORS, SUBSCRIPTION_STATUS_TO_SECTION } from '../config.js';
import { wrapInBase, para, btn, transactionalFooter } from '../htmlHelpers.js';
import { getEmailSection, resolveLocale } from '../../i18n/index.js';

/**
 * @param {string}      status           Stripe subscription status string
 * @param {string|null} stripePortalLink Billing portal URL (falls back to /billing)
 * @param {string}      [locale]         BCP-47 locale tag, e.g. 'en-US'
 * @returns {{ subject: string, html: string }}
 */
export function buildSubscriptionNotificationEmail(status, stripePortalLink, locale = 'en-US') {
  const resolved   = resolveLocale(locale);
  const sectionKey = SUBSCRIPTION_STATUS_TO_SECTION[status] ?? 'subscriptionPastDue';
  const s          = getEmailSection(resolved, sectionKey);
  const color      = SUBSCRIPTION_STATUS_COLORS[status] ?? CONFIG.colors.warning;
  const portalUrl  = stripePortalLink ?? `${CONFIG.appBaseUrl}/billing`;
  const lang       = resolved.split('-')[0]; // 'en', 'es', 'fr', …

  // Each i18n section provides: subject, headerTitle, body (or body1/body2), buttonText, note
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
