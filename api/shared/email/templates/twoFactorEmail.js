/**
 * Two-factor authentication email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createCodeDisplay, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { getEmailSection, t } from '../i18n/index.js';

/**
 * Generate 2FA email
 * @param {Object} data - Template data
 * @param {string} data.code - 2FA code
 * @param {number} [data.expiryMinutes] - Code expiry in minutes
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string }}
 */
export function generateTwoFactorEmail(data) {
    const { code, expiryMinutes = EMAIL_CONFIG.expiry.twoFactor, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'twoFactor');

    const content = `
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">${s.heading}</h2>
        ${createParagraph(s.intro)}
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
export const twoFactorEmailSubject = 'Two-Factor Authentication Code - Psychic Chat';
