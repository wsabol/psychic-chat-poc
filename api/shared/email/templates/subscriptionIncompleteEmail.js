/**
 * Subscription Incomplete Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createButton, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

export const subscriptionIncompleteEmailSubject = 'Complete Your Subscription';

/**
 * Generate subscription incomplete email
 * @param {Object} data - Email data
 * @param {string} data.stripePortalLink - Link to Stripe portal
 * @returns {Object} Email content with subject and html
 */
export function generateSubscriptionIncompleteEmail(data) {
  const { stripePortalLink } = data;

  const content = `
    ${createHeader('Complete Your Subscription', EMAIL_CONFIG.colors.warning, '📋')}
    ${createParagraph('Your subscription setup is incomplete. Please complete the payment to activate your account.')}
    ${createButton('Complete Setup', stripePortalLink)}
    <p style="font-size: 14px; color: ${EMAIL_CONFIG.colors.textLight}; line-height: 1.6;">Your subscription setup needs to be completed to access Starship Psychics premium features.</p>
    ${createFooter()}
  `;

  return {
    subject: subscriptionIncompleteEmailSubject,
    html: wrapInBaseTemplate(content)
  };
}
