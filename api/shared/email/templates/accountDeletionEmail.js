/**
 * Account deletion verification email template
 * Sent when a user initiates account deletion to confirm their intent.
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createCodeDisplay, createParagraph, createFooter } from './components.js';
import { getEmailSection, t } from '../i18n/index.js';

/**
 * Generate account deletion verification email HTML
 * @param {Object} data - Template data
 * @param {string} data.code - 6-digit verification code
 * @param {number} [data.expiryMinutes=10] - Code expiry in minutes
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string }}
 */
export function generateAccountDeletionEmail(data) {
    const { code, expiryMinutes = 10, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'accountDeletion');

    const content = `
        <h2 style="color: #d32f2f; margin-top: 0;">${s.heading}</h2>
        ${createParagraph(s.intro)}
        ${createCodeDisplay(code)}
        ${createParagraph(t(s.expiry, { expiryMinutes }), '14px')}
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 14px; margin: 16px 0; font-size: 14px; color: #856404; line-height: 1.6;">
            <strong>${s.whatHappensTitle}</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                <li>${s.bullet1}</li>
                <li>${s.bullet2}</li>
                <li>${s.bullet3}</li>
                <li>${s.bullet4}</li>
            </ul>
        </div>
        ${createParagraph(s.notYou, '14px')}
        ${createFooter()}
    `;

    return {
        subject: s.subject,
        html: wrapInBaseTemplate(content),
    };
}

// Backward-compatible constant (English) for callers that don't yet pass locale
export const accountDeletionEmailSubject = 'Account Deletion Verification – Psychic Chat';
