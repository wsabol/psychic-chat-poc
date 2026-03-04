/**
 * Subscription price change notification email template
 */
import { wrapInBaseTemplate } from './baseTemplate.js';
import { createHeader, createParagraph, createButton, createInfoBox, createWarningBox, createSection, createOrderedList, createFooter } from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { formatEmailDate } from '../utils/dateFormatter.js';
import { getEmailSection, t } from '../i18n/index.js';

/**
 * Generate subscription price change notification email
 * @param {Object} data - Template data
 * @param {string} data.interval - 'month' | 'year'
 * @param {number} data.oldAmount - Old price in cents
 * @param {number} data.newAmount - New price in cents
 * @param {Date}   data.effectiveDate - When the new price takes effect
 * @param {string} [data.locale='en-US'] - User locale
 * @returns {{ subject: string, html: string, trackingSettings: Object, emailType: string }}
 */
export function generatePriceChangeEmail(data) {
    const { interval, oldAmount, newAmount, effectiveDate, locale = 'en-US' } = data;
    const s = getEmailSection(locale, 'priceChange');

    const billingLink = `${EMAIL_CONFIG.appBaseUrl}/billing`;

    const oldPrice = (oldAmount / 100).toFixed(2);
    const newPrice = (newAmount / 100).toFixed(2);
    const effectiveDateFormatted = formatEmailDate(effectiveDate);

    // Locale-aware interval labels
    const intervalDisplay = interval === 'month' ? s.intervalMonthly : s.intervalAnnual;
    const intervalUnit    = interval === 'month' ? s.intervalUnitMonth : s.intervalUnitYear;

    const vars = { oldPrice, newPrice, effectiveDateFormatted, intervalDisplay, intervalUnit };

    const content = `
        ${createHeader(s.headerTitle, EMAIL_CONFIG.colors.primary)}
        <h2 style="color: ${EMAIL_CONFIG.colors.text}; margin-top: 0;">${t(s.heading, vars)}</h2>
        ${createParagraph(t(s.intro, vars))}
        ${createInfoBox(`
            ${t(s.labelCurrentPrice, vars)}<br>
            ${t(s.labelNewPrice, vars)}<br>
            ${t(s.labelEffectiveDate, vars)}
        `, EMAIL_CONFIG.colors.primary)}
        ${createSection(s.whatMeansTitle, t(s.whatMeansBody, vars))}
        ${createButton(s.buttonText, billingLink)}
        ${createWarningBox(s.timelineTitle, `<strong>${t(s.timelineBody, vars)}</strong>`)}
        ${createSection(
            s.optionsTitle,
            createOrderedList([
                t(s.option1, vars),
                t(s.option2, vars),
                t(s.option3, vars),
            ])
        )}
        ${createSection(
            s.whyTitle,
            `${s.whyIntro}
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>${s.whyBullet1}</li>
                <li>${s.whyBullet2}</li>
                <li>${s.whyBullet3}</li>
            </ul>`
        )}
        ${createFooter(s.footerNote)}
    `;

    return {
        subject: t(s.subject, vars),
        html: wrapInBaseTemplate(content),
        trackingSettings: {
            clickTracking: { enable: true, enableText: true },
            openTracking:  { enable: true },
        },
        emailType: 'price_change',
    };
}
