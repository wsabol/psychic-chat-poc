/**
 * Payment Failed Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createButton, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

export const paymentFailedEmailSubject = 'Payment Failed - Update Required';

/**
 * Generate payment failed email
 * @param {Object} data - Email data
 * @param {string} data.stripePortalLink - Link to Stripe portal
 * @param {number} [data.amount] - Amount in cents
 * @param {string} [data.currency] - Currency code
 * @returns {Object} Email content with subject and html
 */
export function generatePaymentFailedEmail(data) {
  const { stripePortalLink, amount, currency } = data;
  
  const amountDisplay = amount 
    ? `<p style="font-size: 16px; color: ${EMAIL_CONFIG.colors.text}; line-height: 1.6;"><strong>Amount:</strong> ${(currency || 'USD').toUpperCase()} ${(amount / 100).toFixed(2)}</p>`
    : '';

  const content = `
    ${createHeader('Payment Failed', EMAIL_CONFIG.colors.danger, '❌')}
    ${createParagraph('Your recent payment for your Starship Psychics subscription failed. Please update your payment method to continue using the app.')}
    ${amountDisplay}
    ${createButton('Update Payment Method', stripePortalLink, EMAIL_CONFIG.colors.danger)}
    <p style="font-size: 14px; color: ${EMAIL_CONFIG.colors.textLight}; line-height: 1.6;">If you continue to experience issues, please contact our support team.</p>
    ${createFooter()}
  `;

  return {
    subject: paymentFailedEmailSubject,
    html: wrapInBaseTemplate(content)
  };
}
