/**
 * Subscription price change notification email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createHeader, createParagraph, createButton, createInfoBox, createWarningBox, createSection, createOrderedList, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { formatEmailDate } from '../utils/dateFormatter.js';

/**
 * Generate subscription price change notification email HTML
 * @param {Object} data - Template data
 * @param {string} data.interval - 'month' | 'year'
 * @param {number} data.oldAmount - Old price in cents
 * @param {number} data.newAmount - New price in cents
 * @param {Date} data.effectiveDate - When the new price takes effect (next billing date)
 * @returns {Object} Email content with subject and HTML
 */
export function generatePriceChangeEmail(data) {
    const { interval, oldAmount, newAmount, effectiveDate } = data;
    
    const billingLink = `${EMAIL_CONFIG.appBaseUrl}/billing`;
    
    // Format prices
    const oldPrice = (oldAmount / 100).toFixed(2);
    const newPrice = (newAmount / 100).toFixed(2);
    
    // Format effective date
    const effectiveDateFormatted = formatEmailDate(effectiveDate);
    
    // Determine interval display
    const intervalDisplay = interval === 'month' ? 'monthly' : 'annual';
    const intervalUnit = interval === 'month' ? 'month' : 'year';
    
    const content = `
        ${createHeader('💰 Subscription Price Update', EMAIL_CONFIG.colors.primary)}
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">Important Update About Your ${intervalDisplay.charAt(0).toUpperCase() + intervalDisplay.slice(1)} Subscription</h2>
        ${createParagraph(`We're writing to inform you of an update to our subscription pricing. Your ${intervalDisplay} subscription price will change on your next billing date.`)}
        ${createInfoBox(`
            <strong>Current Price:</strong> $${oldPrice}/${intervalUnit}<br>
            <strong>New Price:</strong> $${newPrice}/${intervalUnit}<br>
            <strong>Effective Date:</strong> ${effectiveDateFormatted}
        `, EMAIL_CONFIG.colors.primary)}
        ${createSection(
            'What This Means For You',
            `Your subscription will automatically renew at the new price of <strong>$${newPrice}/${intervalUnit}</strong> on ${effectiveDateFormatted}. 
            This change allows us to continue providing you with quality service, new features, and ongoing improvements to your experience.`
        )}
        ${createButton('View Billing Details', billingLink)}
        ${createWarningBox(
            '📅 Important Timeline',
            `<strong>Your next billing date is ${effectiveDateFormatted}</strong>. 
            On this date, you'll be charged the new amount of $${newPrice}. 
            Until then, you'll continue to enjoy your current subscription at the current price.`
        )}
        ${createSection(
            'Your Options',
            createOrderedList([
                '<strong>Continue Your Subscription:</strong> No action needed - your subscription will automatically continue at the new price',
                '<strong>Review Your Billing:</strong> Visit your Billing & Payments page to review your subscription details',
                '<strong>Cancel Anytime:</strong> If you prefer not to continue at the new price, you can cancel your subscription before your next billing date'
            ])
        )}
        ${createSection(
            'Why This Change?',
            `We're committed to delivering the best possible experience for our users. This price adjustment helps us:
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Continue developing new features and improvements</li>
                <li>Maintain our high-quality service and support</li>
                <li>Invest in better infrastructure and reliability</li>
            </ul>`
        )}
        ${createFooter(`
            Thank you for being a valued member of Starship Psychics. We appreciate your continued support. 
            If you have any questions about this change, please don't hesitate to contact our support team.
        `)}
    `;
    
    const subject = `Important: Your ${intervalDisplay.charAt(0).toUpperCase() + intervalDisplay.slice(1)} Subscription Price Update`;
    
    return {
        subject,
        html: wrapInBaseTemplate(content),
        trackingSettings: {
            clickTracking: { enable: true, enableText: true },
            openTracking: { enable: true }
        },
        emailType: 'price_change'
    };
}
