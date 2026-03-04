/**
 * Subscription Expiring Email Template
 */
import { wrapInBaseTemplate } from '../templates/baseTemplate.js';
import { createHeader, createParagraph, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { getEmailSection, t } from '../i18n/index.js';

/**
 * Generate subscription expiring email
 * @param {Object} data - Email data
 * @param {number} data.daysRemaining - Days until expiration
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string }}
 */
export function generateSubscriptionExpiringEmail(data) {
    const { daysRemaining, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'subscriptionExpiring');
    const vars = { daysRemaining };

    const content = `
        ${createHeader(s.headerTitle, EMAIL_CONFIG.colors.warning, '⏰')}
        ${createParagraph(t(s.body, vars))}
        ${createParagraph(s.note, '14px')}
        ${createFooter()}
    `;

    return {
        subject: t(s.subject, vars),
        html: wrapInBaseTemplate(content),
    };
}

/**
 * Get subscription expiring email subject (backward-compatible helper)
 * @param {number} daysRemaining
 * @param {string} [locale='en-US']
 */
export function getSubscriptionExpiringEmailSubject(daysRemaining, locale = 'en-US') {
    const s = getEmailSection(locale, 'subscriptionExpiring');
    return t(s.subject, { daysRemaining });
}
