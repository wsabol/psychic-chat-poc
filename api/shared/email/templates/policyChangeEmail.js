/**
 * Policy change notification email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createHeader, createParagraph, createButton, createInfoBox, createWarningBox, createSection, createOrderedList, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { formatEmailDate, calculateDaysRemaining } from '../utils/dateFormatter.js';

/**
 * Generate policy change notification email HTML
 * @param {Object} data - Template data
 * @param {string} data.documentType - 'terms' | 'privacy' | 'both'
 * @param {string} data.version - New version number
 * @param {string} data.changeType - 'MAJOR' | 'MINOR'
 * @param {string} data.description - Description of changes
 * @param {Date} data.gracePeriodEnd - Deadline to accept
 * @param {boolean} data.isReminder - Whether this is a reminder email
 * @returns {Object} Email content with subject and HTML
 */
export function generatePolicyChangeEmail(data) {
    const { documentType, description, gracePeriodEnd, isReminder = false } = data;
    
    const loginLink = `${EMAIL_CONFIG.appBaseUrl}/login`;
    
    // Determine document name(s)
    let documentName;
    if (documentType === 'both') {
        documentName = 'Terms of Service and Privacy Policy';
    } else if (documentType === 'terms') {
        documentName = 'Terms of Service';
    } else {
        documentName = 'Privacy Policy';
    }
    
    // Format grace period end date
    const gracePeriodDate = formatEmailDate(gracePeriodEnd);
    
    // Calculate days remaining
    const daysRemaining = calculateDaysRemaining(gracePeriodEnd);
    
    // Determine styling and messaging based on reminder status
    const headerColor = isReminder ? EMAIL_CONFIG.colors.warning : EMAIL_CONFIG.colors.primary;
    const headerIcon = isReminder ? '⚠️ Reminder' : '📋 Important Update';
    const urgencyMessage = isReminder
        ? `<strong>⚠️ ${daysRemaining} days remaining</strong> - Please log in to review and accept the updated ${documentName}.`
        : `You have <strong>30 days</strong> (until ${gracePeriodDate}) to review and accept these changes.`;
    
    const content = `
        ${createHeader(headerIcon, headerColor)}
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">We've Updated Our ${documentName}</h2>
        ${createParagraph(`${isReminder ? 'This is a reminder that you' : 'You'} need to review and accept our updated ${documentName}.`)}
        ${createInfoBox(urgencyMessage, headerColor)}
        ${createSection(
            'What\'s Changed?',
            description || 'We\'ve made important updates to better serve you and maintain compliance with current regulations.'
        )}
        ${createButton('Log In to Review & Accept', loginLink)}
        ${createWarningBox(
            '⏰ Important Deadline',
            `<strong>By ${gracePeriodDate}</strong>, you must log in and accept the updated ${documentName}. 
            If you do not accept by this date, you will be automatically logged out and unable to access your account until you accept the new terms.`
        )}
        ${createSection(
            'What You Need to Do',
            createOrderedList([
                'Log in to your Psychic Chat account',
                `Review the updated ${documentName}`,
                'Accept the changes to continue using your account'
            ])
        )}
        ${createFooter(`
            We value your privacy and are committed to transparency. If you have any questions about these changes, 
            please contact our support team.
        `)}
    `;
    
    const subject = isReminder
        ? `Reminder: Action Required - Review Updated ${documentName}`
        : `Important: Updates to Our ${documentName}`;
    
    return {
        subject,
        html: wrapInBaseTemplate(content),
        trackingSettings: {
            clickTracking: { enable: true, enableText: true },
            openTracking: { enable: true }
        },
        emailType: isReminder ? 'policy_reminder' : 'policy_change'
    };
}
