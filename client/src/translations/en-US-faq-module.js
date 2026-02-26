/**
 * FAQ Translations - English (US) - Web
 *
 * Assembled from section files for easier translation management.
 * Sections:
 *   section-1: getting-started, chat-features, personal-info, birth-chart
 *   section-2: onboarding, horoscope, moon-cosmic, preferences
 *   section-3: account-security, billing, privacy, technical, support
 *
 * To translate: copy this module and the three section files, rename them for
 * the target locale, update the JSON files with translated content, and import
 * the module from TranslationContext.
 */
import section1 from './en-US-faq-section-1.json';
import section2 from './en-US-faq-section-2.json';
import section3 from './en-US-faq-section-3.json';

const enUSFAQ = {
  faq: {
    ...section1.faq,
    ...section2.faq,
    ...section3.faq,
  },
};

export default enUSFAQ;
