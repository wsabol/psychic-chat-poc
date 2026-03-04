/**
 * Payment Failed Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createButton, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { getEmailSection } from '../i18n/index.js';

/**
 * Generate payment failed email
 * @param {Object} data - Email data
 * @param {string} data.stripePortalLink - Link to Stripe portal
 * @param {number} [data.amount] - Amount in cents
 * @param {string} [data.currency] - Currency code
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string }}
 */
export function generatePaymentFailedEmail(data) {
    const { stripePortalLink, amount, currency, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'paymentFailed');

    const amountDisplay = amount
        ? `<p style="font-size: 16px; color: ${EMAIL_CONFIG.colors.text}; line-height: 1.6;">${s.labelAmount} ${(currency || 'USD').toUpperCase()} ${(amount / 100).toFixed(2)}</p>`
        : '';

    const content = `
        ${createHeader(s.headerTitle, EMAIL_CONFIG.colors.danger, '❌')}
        ${createParagraph(s.body)}
        ${amountDisplay}
        ${createButton(s.buttonText, stripePortalLink, EMAIL_CONFIG.colors.danger)}
        <p style="font-size: 14px; color: ${EMAIL_CONFIG.colors.textLight}; line-height: 1.6;">${s.note}</p>
        ${createFooter()}
    `;

    return {
        subject: s.subject,
        html: wrapInBaseTemplate(content),
    };
}

// Backward-compatible constant (English)
export const paymentFailedEmailSubject = 'Payment Failed - Update Required';
