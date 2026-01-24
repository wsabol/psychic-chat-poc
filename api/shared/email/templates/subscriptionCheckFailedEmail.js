/**
 * Subscription Check Failed Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

export const subscriptionCheckFailedEmailSubject = 'Subscription Verification';

/**
 * Generate subscription check failed email
 * @param {Object} data - Email data
 * @param {string} data.reason - Reason for failure ('STRIPE_API_DOWN' | 'NO_SUBSCRIPTION' | other)
 * @returns {Object} Email content with subject and html
 */
export function generateSubscriptionCheckFailedEmail(data) {
  const { reason } = data;

  let message = 'We are unable to verify your subscription status. Please try logging in again.';

  if (reason === 'STRIPE_API_DOWN') {
    message = 'Stripe is temporarily unavailable. We will verify your subscription shortly.';
  } else if (reason === 'NO_SUBSCRIPTION') {
    message = 'No subscription found on your account. Please create one to continue using the app.';
  }

  const content = `
    ${createHeader('Subscription Verification', EMAIL_CONFIG.colors.info, 'ℹ️')}
    ${createParagraph(message)}
    ${createParagraph('If you continue to experience issues, please log in to your account and check your subscription status.', '14px')}
    ${createFooter()}
  `;

  return {
    subject: subscriptionCheckFailedEmailSubject,
    html: wrapInBaseTemplate(content)
  };
}
