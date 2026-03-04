/**
 * Account reengagement email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createParagraph, createButton, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { generateReactivationToken } from '../utils/tokenGenerator.js';
import { getEmailSection, t } from '../i18n/index.js';

/**
 * Generate account reengagement email
 * @param {Object} data - Template data
 * @param {string} data.userId - User ID
 * @param {string} data.emailType - '6_month' or '12_month'
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string, trackingSettings: Object }}
 */
export function generateReengagementEmail(data) {
    const { userId, emailType, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'reengagement');

    const reactivateLink = `${EMAIL_CONFIG.appBaseUrl}/reactivate?userId=${encodeURIComponent(userId)}&token=${generateReactivationToken(userId)}`;
    const unsubscribeLink = `${EMAIL_CONFIG.appBaseUrl}/unsubscribe-reengagement?userId=${encodeURIComponent(userId)}&token=${generateReactivationToken(userId)}`;

    const is6Month = emailType === '6_month';
    const headline = is6Month ? s.headline6Month : s.headline12Month;
    const message  = is6Month ? s.message6Month  : s.message12Month;
    const subject  = is6Month ? s.subject6Month  : s.subject12Month;

    const content = `
        <h1 style="color: ${EMAIL_CONFIG.colors.primary}; text-align: center; margin-top: 0;">${headline}</h1>
        ${createParagraph(message)}
        ${createButton(s.buttonText, reactivateLink)}
        ${createParagraph(s.note, '14px')}
        ${createFooter(`
            If you prefer not to receive these emails, you can 
            <a href="${unsubscribeLink}" style="color: ${EMAIL_CONFIG.colors.primary}; text-decoration: none;">
                ${s.unsubscribeText}
            </a>.
        `)}
    `;

    return {
        subject,
        html: wrapInBaseTemplate(content),
        trackingSettings: {
            clickTracking:       { enable: true, enableText: true },
            openTracking:        { enable: true },
            unsubscribeTracking: { enable: true, text: s.unsubscribeText },
        },
    };
}
