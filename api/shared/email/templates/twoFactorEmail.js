/**
 * Two-factor authentication email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createCodeDisplay, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

/**
 * Generate 2FA email HTML
 * @param {Object} data - Template data
 * @param {string} data.code - 2FA code
 * @param {number} data.expiryMinutes - Code expiry in minutes
 * @returns {string} HTML email content
 */
export function generateTwoFactorEmail(data) {
    const { code, expiryMinutes = EMAIL_CONFIG.expiry.twoFactor } = data;
    
    const content = `
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">Two-Factor Authentication</h2>
        ${createParagraph('Your two-factor authentication code is:')}
        ${createCodeDisplay(code)}
        ${createParagraph(`This code will expire in ${expiryMinutes} minutes.`, '14px')}
        ${createParagraph('If you did not request this code, please ignore this email.', '14px')}
        ${createFooter()}
    `;
    
    return wrapInBaseTemplate(content);
}

export const twoFactorEmailSubject = 'Two-Factor Authentication Code - Psychic Chat';
