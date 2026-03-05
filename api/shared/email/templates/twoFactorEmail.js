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
 * @param {string|null} [data.magicLink] - Optional one-click verify URL
 * @returns {{ subject: string, html: string }}
 */
export function generateTwoFactorEmail(data) {
    const { code, expiryMinutes = EMAIL_CONFIG.expiry.twoFactor, locale = 'en-US', magicLink = null } = data;
    const s = getEmailSection(locale, 'twoFactor');

    // Magic-link section: a prominent button the user can click instead of
    // typing the 6-digit code.  Only rendered when a link is provided.
    const magicLinkSection = magicLink ? `
        <div style="text-align: center; margin: 1.5rem 0;">
            <p style="color: #666; font-size: 14px; margin-bottom: 1rem;">
                — or —
            </p>
            <a href="${magicLink}"
               style="display: inline-block;
                      padding: 14px 32px;
                      background: linear-gradient(135deg, #7c63d8, #6a52c0);
                      color: #ffffff;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: 700;
                      font-size: 1rem;
                      letter-spacing: 0.5px;
                      box-shadow: 0 4px 12px rgba(124,99,216,0.35);">
                ✓ Verify My Email &amp; Sign In
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 0.75rem;">
                This button expires in ${expiryMinutes} minutes and can only be used once.
            </p>
        </div>
    ` : '';

    const content = `
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">${s.heading}</h2>
        ${createParagraph(s.intro)}
        ${createCodeDisplay(code)}
        ${magicLinkSection}
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
