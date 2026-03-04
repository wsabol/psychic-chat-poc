/**
 * Password reset email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createCodeDisplay, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { getEmailSection, t } from '../i18n/index.js';

/**
 * Generate password reset email
 * @param {Object} data - Template data
 * @param {string} data.code - Reset code
 * @param {number} [data.expiryMinutes] - Code expiry in minutes
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string }}
 */
export function generatePasswordResetEmail(data) {
    const { code, expiryMinutes = EMAIL_CONFIG.expiry.passwordReset, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'passwordReset');

    const content = `
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">${s.heading}</h2>
        ${createParagraph(s.intro)}
        ${createParagraph(s.codeIntro)}
        ${createCodeDisplay(code)}
        ${createParagraph(t(s.expiry, { expiryMinutes }), '14px')}
        ${createParagraph(s.instruction, '14px')}
        ${createFooter()}
    `;

    return {
        subject: s.subject,
        html: wrapInBaseTemplate(content),
    };
}

// Backward-compatible constant (English)
export const passwordResetEmailSubject = 'Reset Your Password - Psychic Chat';
