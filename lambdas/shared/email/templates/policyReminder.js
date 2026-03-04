/**
 * Policy Reminder / Policy Change Email Template
 *
 * Builds the HTML and subject line for both the initial policy-change notice
 * and the follow-up reminder sent 21 days later.
 *
 * Export:
 *   buildPolicyReminderEmail(gracePeriodEnd, documentType, description, isReminder, locale?)
 *     → { subject, html }
 */

import { CONFIG } from '../config.js';
import {
  wrapInBase,
  para,
  btn,
  infoBox,
  warningBox,
  optOutFooter,
} from '../htmlHelpers.js';
import { getEmailSection, resolveLocale, t } from '../../i18n/index.js';

/**
 * @param {Date|string} gracePeriodEnd  Deadline date for accepting the policy
 * @param {'terms'|'privacy'|'both'} documentType  Which document(s) changed
 * @param {string}      description     Human-readable summary of what changed
 * @param {boolean}     isReminder      true = follow-up reminder, false = initial notice
 * @param {string}      [locale]        BCP-47 locale tag, e.g. 'en-US'
 * @returns {{ subject: string, html: string }}
 */
export function buildPolicyReminderEmail(
  gracePeriodEnd,
  documentType,
  description,
  isReminder,
  locale = 'en-US'
) {
  const resolved = resolveLocale(locale);
  const s        = getEmailSection(resolved, 'policyChange');
  const lang     = resolved.split('-')[0]; // 'en', 'es', 'fr', …
  const C        = CONFIG.colors;

  // ── Resolve document name from locale strings ───────────────────────────
  const docName = documentType === 'both'  ? s.docBoth
                : documentType === 'terms' ? s.docTerms
                :                            s.docPrivacy;

  // ── Format deadline date in user's locale ───────────────────────────────
  const deadline = gracePeriodEnd
    ? new Date(gracePeriodEnd).toLocaleDateString(resolved, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  const daysRemaining = gracePeriodEnd
    ? Math.max(0, Math.ceil((new Date(gracePeriodEnd) - Date.now()) / 86_400_000))
    : 30;

  // ── Locale-aware copy ───────────────────────────────────────────────────
  const headerColor = isReminder ? C.warning  : C.primary;
  const headerIcon  = isReminder ? s.headerReminder : s.headerInitial;
  const urgencyMsg  = isReminder
    ? t(s.urgencyReminder, { daysRemaining, documentName: docName })
    : t(s.urgencyInitial,  { gracePeriodDate: deadline });

  const intro = isReminder
    ? t(s.introReminder, { documentName: docName })
    : t(s.introInitial,  { documentName: docName });

  const subject = isReminder
    ? t(s.subjectReminder, { documentName: docName })
    : t(s.subjectInitial,  { documentName: docName });

  const loginUrl = `${CONFIG.appBaseUrl}/login`;

  // ── HTML ────────────────────────────────────────────────────────────────
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
