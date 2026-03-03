/**
 * Account deletion verification email template
 * Sent when a user initiates account deletion to confirm their intent.
 * Also explains the new grace period / subscription-end procedure.
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createCodeDisplay, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

/**
 * Generate account deletion verification email HTML
 * @param {Object} data - Template data
 * @param {string} data.code - 6-digit verification code
 * @param {number} [data.expiryMinutes=10] - Code expiry in minutes
 * @returns {string} HTML email content
 */
export function generateAccountDeletionEmail(data) {
    const { code, expiryMinutes = 10 } = data;

    const content = `
        <h2 style="color: #d32f2f; margin-top: 0;">⚠️ Account Deletion Request</h2>
        ${createParagraph('We received a request to <strong>permanently delete your Psychic Chat account</strong>. To confirm this action, please enter the verification code below.')}
        ${createCodeDisplay(code)}
        ${createParagraph(`This code expires in <strong>${expiryMinutes} minutes</strong>.`, '14px')}
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 14px; margin: 16px 0; font-size: 14px; color: #856404; line-height: 1.6;">
            <strong>What happens when you confirm:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                <li>Your <strong>subscription will be cancelled immediately</strong> — you will not be charged for any new billing period.</li>
                <li>You will retain full access to your account <strong>until the end of your current subscription period</strong>.</li>
                <li>After that, your personal information will be permanently removed from our systems.</li>
                <li>You may cancel this deletion request any time before your subscription expires.</li>
            </ul>
        </div>
        ${createParagraph('If you did <strong>not</strong> request to delete your account, please ignore this email — your account will remain active.', '14px')}
        ${createFooter()}
    `;

    return wrapInBaseTemplate(content);
}

export const accountDeletionEmailSubject = 'Account Deletion Verification – Psychic Chat';
