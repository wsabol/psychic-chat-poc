/**
 * Subscription Expiring Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';

/**
 * Generate subscription expiring email subject
 * @param {number} daysRemaining - Days until expiration
 * @returns {string} Email subject
 */
export function getSubscriptionExpiringEmailSubject(daysRemaining) {
  return `Your Subscription Expires in ${daysRemaining} Days`;
}

/**
 * Generate subscription expiring email
 * @param {Object} data - Email data
 * @param {number} data.daysRemaining - Days until expiration
 * @returns {Object} Email content with subject and html
 */
export function generateSubscriptionExpiringEmail(data) {
  const { daysRemaining } = data;
  const message = `Your subscription expires in ${daysRemaining} days. Renew now to avoid service interruption.`;

  const content = `
    ${createHeader('Subscription Expiring Soon', EMAIL_CONFIG.colors.warning, '⏰')}
    ${createParagraph(message)}
    ${createParagraph('Renew your subscription to continue enjoying unlimited access to all premium features.', '14px')}
    ${createFooter()}
  `;

  return {
    subject: getSubscriptionExpiringEmailSubject(daysRemaining),
    html: wrapInBaseTemplate(content)
  };
}
