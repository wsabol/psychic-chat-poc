/**
 * Email verification template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createCodeDisplay, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

/**
 * Generate email verification HTML
 * @param {Object} data - Template data
 * @param {string} data.code - Verification code
 * @param {number} data.expiryMinutes - Code expiry in minutes
 * @returns {string} HTML email content
 */
export function generateVerificationEmail(data) {
    const { code, expiryMinutes = EMAIL_CONFIG.expiry.verification } = data;
    
    const content = `
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">Verify Your Email</h2>
        ${createParagraph('Welcome to Psychic Chat! Please verify your email address to complete registration.')}
        ${createParagraph('Your verification code is:')}
        ${createCodeDisplay(code)}
        ${createParagraph(`This code will expire in ${expiryMinutes} minutes.`, '14px')}
        ${createParagraph('If you did not create this account, please ignore this email.', '14px')}
        ${createFooter()}
    `;
    
    return wrapInBaseTemplate(content);
}

export const verificationEmailSubject = 'Verify Your Email - Psychic Chat';
