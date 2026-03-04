/**
 * Subscription Check Failed Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { getEmailSection } from '../i18n/index.js';

/**
 * Generate subscription check failed email
 * @param {Object} data - Email data
 * @param {string} data.reason - 'STRIPE_API_DOWN' | 'NO_SUBSCRIPTION' | other
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string }}
 */
export function generateSubscriptionCheckFailedEmail(data) {
    const { reason, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'subscriptionCheckFailed');

    const message = reason === 'STRIPE_API_DOWN' ? s.messageStripeDown
                  : reason === 'NO_SUBSCRIPTION' ? s.messageNoSub
                  : s.messageDefault;

    const content = `
        ${createHeader(s.headerTitle, EMAIL_CONFIG.colors.info, 'ℹ️')}
        ${createParagraph(message)}
        ${createParagraph(s.note, '14px')}
        ${createFooter()}
    `;

    return {
        subject: s.subject,
        html: wrapInBaseTemplate(content),
    };
}

// Backward-compatible constant (English)
export const subscriptionCheckFailedEmailSubject = 'Subscription Verification';
