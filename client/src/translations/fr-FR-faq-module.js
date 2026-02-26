/**
 * FAQ Translations - French (FR) - Web
 *
 * Assembled from section files for easier translation management.
 * To translate: update the three fr-FR-faq-section-*.json files with translated content.
 */
import section1 from './fr-FR-faq-section-1.json';
import section2 from './fr-FR-faq-section-2.json';
import section3 from './fr-FR-faq-section-3.json';

const frFRFAQ = {
  faq: {
    ...section1.faq,
    ...section2.faq,
    ...section3.faq,
  },
};

export default frFRFAQ;
