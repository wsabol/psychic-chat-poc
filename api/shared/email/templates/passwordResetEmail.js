/**
 * Password reset email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createCodeDisplay, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

/**
 * Generate password reset email HTML
 * @param {Object} data - Template data
 * @param {string} data.code - Reset code
 * @param {number} data.expiryMinutes - Code expiry in minutes
 * @returns {string} HTML email content
 */
export function generatePasswordResetEmail(data) {
    const { code, expiryMinutes = EMAIL_CONFIG.expiry.passwordReset } = data;
    
    const content = `
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">Reset Your Password</h2>
        ${createParagraph('We received a request to reset your password. If you did not make this request, please ignore this email.')}
        ${createParagraph('Your password reset code is:')}
        ${createCodeDisplay(code)}
        ${createParagraph(`This code will expire in ${expiryMinutes} minutes.`, '14px')}
        ${createParagraph('Use this code to reset your password. You will need to confirm your new password.', '14px')}
        ${createFooter()}
    `;
    
    return wrapInBaseTemplate(content);
}

export const passwordResetEmailSubject = 'Reset Your Password - Psychic Chat';
