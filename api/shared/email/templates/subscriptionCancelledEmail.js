/**
 * Subscription Cancelled Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createButton, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { getEmailSection } from '../i18n/index.js';

/**
 * Generate subscription cancelled email
 * @param {Object} data - Email data
 * @param {string} data.stripePortalLink - Link to Stripe portal
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string }}
 */
export function generateSubscriptionCancelledEmail(data) {
    const { stripePortalLink, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'subscriptionCancelled');

    const content = `
        ${createHeader(s.headerTitle, EMAIL_CONFIG.colors.warning, '⚠️')}
        ${createParagraph(s.body1)}
        ${createParagraph(s.body2)}
        ${createButton(s.buttonText, stripePortalLink)}
        <p style="font-size: 14px; color: ${EMAIL_CONFIG.colors.textLight}; line-height: 1.6;">${s.note}</p>
        ${createFooter()}
    `;

    return {
        subject: s.subject,
        html: wrapInBaseTemplate(content),
    };
}

// Backward-compatible constant (English)
export const subscriptionCancelledEmailSubject = 'Subscription Cancelled';
