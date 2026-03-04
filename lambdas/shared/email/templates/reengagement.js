/**
 * Re-engagement Email Template
 *
 * Builds the HTML and subject line for accounts that are pending deletion
 * and haven't logged in for 6 months or 1 year.
 *
 * Export:
 *   buildReengagementEmail(userId, emailType, locale?) → { subject, html }
 */

import { CONFIG } from '../config.js';
import { wrapInBase, para, btn, optOutFooter } from '../htmlHelpers.js';
import { getEmailSection, resolveLocale } from '../../i18n/index.js';

/**
 * @param {string}             userId     Raw user ID (used in reactivation link)
 * @param {'6_month'|'1_year'} emailType
 * @param {string}             [locale]   BCP-47 locale tag, e.g. 'en-US'
 * @returns {{ subject: string, html: string }}
 */
export function buildReengagementEmail(userId, emailType, locale = 'en-US') {
  const resolved      = resolveLocale(locale);
  const s             = getEmailSection(resolved, 'reengagement');
  const is6Month      = emailType === '6_month';
  const lang          = resolved.split('-')[0]; // 'en', 'es', 'fr', …

  const reactivateUrl  = `${CONFIG.appBaseUrl}/reactivate?userId=${encodeURIComponent(userId)}`;
  const unsubscribeUrl = `${CONFIG.appBaseUrl}/unsubscribe-reengagement?userId=${encodeURIComponent(userId)}`;

  const html = wrapInBase(`
    <h1 style="color:${CONFIG.colors.primary};text-align:center;margin-top:0;">
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
