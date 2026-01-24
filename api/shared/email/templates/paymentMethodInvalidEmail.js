/**
 * Payment Method Invalid Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createButton, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

export const paymentMethodInvalidEmailSubject = 'Payment Method Needs Attention';

/**
 * Generate payment method invalid email
 * @param {Object} data - Email data
 * @param {string} data.stripePortalLink - Link to Stripe portal
 * @returns {Object} Email content with subject and html
 */
export function generatePaymentMethodInvalidEmail(data) {
  const { stripePortalLink } = data;

  const content = `
    ${createHeader('Update Payment Method', EMAIL_CONFIG.colors.danger, '💳')}
    ${createParagraph('Your payment method on file has expired or is invalid. Please update it to maintain your Starship Psychics subscription.')}
    ${createButton('Update Payment Method', stripePortalLink, EMAIL_CONFIG.colors.danger)}
    <p style="font-size: 14px; color: ${EMAIL_CONFIG.colors.textLight}; line-height: 1.6;">Without a valid payment method, your subscription may be cancelled. Please update your information as soon as possible.</p>
    ${createFooter()}
  `;

  return {
    subject: paymentMethodInvalidEmailSubject,
    html: wrapInBaseTemplate(content)
  };
}
