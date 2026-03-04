/**
 * Email verification template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createCodeDisplay, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { getEmailSection, t } from '../i18n/index.js';

/**
 * Generate email verification HTML
 * @param {Object} data - Template data
 * @param {string} data.code - Verification code
 * @param {number} [data.expiryMinutes] - Code expiry in minutes
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string }}
 */
export function generateVerificationEmail(data) {
    const { code, expiryMinutes = EMAIL_CONFIG.expiry.verification, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'verification');

    const content = `
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">${s.heading}</h2>
        ${createParagraph(s.welcome)}
        ${createParagraph(s.codeIntro)}
        ${createCodeDisplay(code)}
        ${createParagraph(t(s.expiry, { expiryMinutes }), '14px')}
        ${createParagraph(s.notYou, '14px')}
        ${createFooter()}
    `;

    return {
        subject: s.subject,
        html: wrapInBaseTemplate(content),
    };
}

// Backward-compatible constant (English)
export const verificationEmailSubject = 'Verify Your Email - Psychic Chat';
