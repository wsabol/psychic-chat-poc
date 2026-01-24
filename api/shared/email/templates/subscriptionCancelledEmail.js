/**
 * Subscription Cancelled Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createButton, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

export const subscriptionCancelledEmailSubject = 'Subscription Cancelled';

/**
 * Generate subscription cancelled email
 * @param {Object} data - Email data
 * @param {string} data.stripePortalLink - Link to Stripe portal
 * @returns {Object} Email content with subject and html
 */
export function generateSubscriptionCancelledEmail(data) {
  const { stripePortalLink } = data;

  const content = `
    ${createHeader('Subscription Cancelled', EMAIL_CONFIG.colors.warning, '⚠️')}
    ${createParagraph('Your Starship Psychics subscription has been cancelled. You will lose access to premium features at the end of your billing period.')}
    ${createParagraph('You can reactivate your subscription anytime through your account settings or the link below.')}
    ${createButton('Reactivate Subscription', stripePortalLink)}
    <p style="font-size: 14px; color: ${EMAIL_CONFIG.colors.textLight}; line-height: 1.6;">We'd love to have you back! If you have any questions, please reach out to our support team.</p>
    ${createFooter()}
  `;

  return {
    subject: subscriptionCancelledEmailSubject,
    html: wrapInBaseTemplate(content)
  };
}
