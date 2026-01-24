/**
 * Account reengagement email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createParagraph, createButton, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { generateReactivationToken } from '../utils/tokenGenerator.js';

/**
 * Generate account reengagement email HTML
 * @param {Object} data - Template data
 * @param {string} data.userId - User ID
 * @param {string} data.emailType - '6_month' or '12_month'
 * @returns {Object} Email content with subject and HTML
 */
export function generateReengagementEmail(data) {
    const { userId, emailType } = data;
    
    const reactivateLink = `${EMAIL_CONFIG.appBaseUrl}/reactivate?userId=${encodeURIComponent(userId)}&token=${generateReactivationToken(userId)}`;
    const unsubscribeLink = `${EMAIL_CONFIG.appBaseUrl}/unsubscribe-reengagement?userId=${encodeURIComponent(userId)}&token=${generateReactivationToken(userId)}`;
    
    const is6Month = emailType === '6_month';
    const headline = is6Month ? 'We Miss You!' : 'Your Account is About to Be Deleted';
    const message = is6Month
        ? 'It\'s been 6 months since you requested to delete your account. We understand life changes, and we\'d love to welcome you back whenever you\'re ready. Your data is safely stored and can be reactivated at any time.'
        : 'It\'s been a year since you requested account deletion. This is your final notice before permanent data deletion occurs in 6 months. If you\'d like to keep your account active, simply reactivate it now!';
    
    const content = `
        <h1 style="color: ${EMAIL_CONFIG.colors.primary}; text-align: center; margin-top: 0;">${headline}</h1>
        ${createParagraph(message)}
        ${createButton('Reactivate My Account', reactivateLink)}
        ${createParagraph('Reactivating is quick and easy - all your data will be restored and your account will be fully active.', '14px')}
        ${createFooter(`
            If you prefer not to receive these emails, you can 
            <a href="${unsubscribeLink}" style="color: ${EMAIL_CONFIG.colors.primary}; text-decoration: none;">
                unsubscribe from re-engagement emails
            </a>.
        `)}
    `;
    
    const subject = is6Month
        ? 'We Miss You! Your Psychic Chat Account is Ready to Reactivate'
        : 'Last Chance: Reactivate Your Psychic Chat Account';
    
    return {
        subject,
        html: wrapInBaseTemplate(content),
        trackingSettings: {
            clickTracking: { enable: true, enableText: true },
            openTracking: { enable: true },
            unsubscribeTracking: { enable: true, text: 'Unsubscribe from re-engagement emails' }
        }
    };
}
