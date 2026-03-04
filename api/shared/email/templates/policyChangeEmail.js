/**
 * Policy change notification email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createHeader, createParagraph, createButton, createInfoBox, createWarningBox, createSection, createOrderedList, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { formatEmailDate, calculateDaysRemaining } from '../utils/dateFormatter.js';
import { getEmailSection, t } from '../i18n/index.js';

/**
 * Generate policy change notification email
 * @param {Object} data - Template data
 * @param {string} data.documentType - 'terms' | 'privacy' | 'both'
 * @param {string} data.version - New version number
 * @param {string} data.changeType - 'MAJOR' | 'MINOR'
 * @param {string} data.description - Description of changes
 * @param {Date}   data.gracePeriodEnd - Deadline to accept
 * @param {boolean} [data.isReminder=false] - Whether this is a reminder email
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string, trackingSettings: Object, emailType: string }}
 */
export function generatePolicyChangeEmail(data) {
    const { documentType, description, gracePeriodEnd, isReminder = false, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'policyChange');

    const loginLink = `${EMAIL_CONFIG.appBaseUrl}/login`;

    // Resolve the document name from locale strings
    const documentName = documentType === 'both'  ? s.docBoth
                       : documentType === 'terms' ? s.docTerms
                       :                            s.docPrivacy;

    const gracePeriodDate  = formatEmailDate(gracePeriodEnd);
    const daysRemaining    = calculateDaysRemaining(gracePeriodEnd);

    const headerColor = isReminder ? EMAIL_CONFIG.colors.warning : EMAIL_CONFIG.colors.primary;
    const headerIcon  = isReminder ? s.headerReminder : s.headerInitial;

    const urgencyMessage = isReminder
        ? t(s.urgencyReminder, { daysRemaining, documentName })
        : t(s.urgencyInitial,  { gracePeriodDate });

    const intro = isReminder
        ? t(s.introReminder, { documentName })
        : t(s.introInitial,  { documentName });

    const content = `
        ${createHeader(headerIcon, headerColor)}
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">${t(s.heading, { documentName })}</h2>
        ${createParagraph(intro)}
        ${createInfoBox(urgencyMessage, headerColor)}
        ${createSection(
            s.whatChangedTitle,
            description || s.defaultDescription
        )}
        ${createButton(s.buttonText, loginLink)}
        ${createWarningBox(
            s.deadlineTitle,
            t(s.deadlineBody, { gracePeriodDate, documentName })
        )}
        ${createSection(
            s.whatToDoTitle,
            createOrderedList([
                s.step1,
                t(s.step2, { documentName }),
                s.step3,
            ])
        )}
        ${createFooter(s.footerNote)}
    `;

    const subject = isReminder
        ? t(s.subjectReminder, { documentName })
        : t(s.subjectInitial,  { documentName });

    return {
        subject,
        html: wrapInBaseTemplate(content),
        trackingSettings: {
            clickTracking: { enable: true, enableText: true },
            openTracking:  { enable: true },
        },
        emailType: isReminder ? 'policy_reminder' : 'policy_change',
    };
}
