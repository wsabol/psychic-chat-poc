/**
 * Subscription Past Due Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createButton, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

export const subscriptionPastDueEmailSubject = 'Payment Overdue - Action Required';

/**
 * Generate subscription past due email
 * @param {Object} data - Email data
 * @param {string} data.stripePortalLink - Link to Stripe portal
 * @returns {Object} Email content with subject and html
 */
export function generateSubscriptionPastDueEmail(data) {
  const { stripePortalLink } = data;

  const content = `
    ${createHeader('Payment Overdue', EMAIL_CONFIG.colors.danger, '⚠️')}
    ${createParagraph('Your subscription payment is overdue. Please update your payment method immediately to avoid service interruption.')}
    ${createButton('Update Payment Now', stripePortalLink, EMAIL_CONFIG.colors.danger)}
    <p style="font-size: 14px; color: ${EMAIL_CONFIG.colors.textLight}; line-height: 1.6;">We've made several attempts to charge your payment method. Please take action now to restore your access.</p>
    ${createFooter()}
  `;

  return {
    subject: subscriptionPastDueEmailSubject,
    html: wrapInBaseTemplate(content)
  };
}
