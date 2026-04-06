/**
 * App Update announcement email template
 *
 * Sent to all registered (onboarding-complete) users to notify them that
 * the Starship Psychics mobile app has been updated on Google Play.
 *
 * Supports all 8 app locales; falls back to en-US for any untranslated locale.
 *
 * Usage:
 *   const { subject, html, trackingSettings } = generateAppUpdateEmail({ locale: 'es-ES' });
 */

import { wrapInBaseTemplate } from './baseTemplate.js';
import {
  createHeader,
  createParagraph,
  createButton,
  createInfoBox,
  createFooter,
} from './components.js';
import { EMAIL_CONFIG } from '../config.js';
import { getEmailSection } from '../i18n/index.js';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.starshippsychicsmobile';

/**
 * Generate an app-update announcement email.
 *
 * @param {Object}  [data={}]
 * @param {string}  [data.locale='en-US']  User's preferred locale
 * @returns {{ subject: string, html: string, trackingSettings: Object, emailType: string }}
 */
export function generateAppUpdateEmail(data = {}) {
  const { locale = 'en-US' } = data;
  const s = getEmailSection(locale, 'appUpdate');

  const content = `
    ${createHeader(s.heading, EMAIL_CONFIG.colors.primary)}
    ${createParagraph(s.greeting)}
    ${createParagraph(s.body)}
    ${createButton(s.buttonText, PLAY_STORE_URL)}
    ${createInfoBox(s.note, EMAIL_CONFIG.colors.primary)}
    ${createFooter(s.footerNote)}
  `;

  return {
    subject: s.subject,
    html: wrapInBaseTemplate(content),
    trackingSettings: {
      clickTracking:       { enable: true, enableText: true },
      openTracking:        { enable: true },
      // Tells SendGrid to append a one-click unsubscribe link to every email.
      // Users who click it are added to SendGrid's suppression list and will
      // not receive future blasts.  Required for CAN-SPAM / GDPR compliance
      // when sending to all users.
      unsubscribeTracking: { enable: true },
    },
    emailType: 'app_update',
  };
}
