/**
 * FAQ Translations - Spanish (ES) - Web
 *
 * Assembled from section files for easier translation management.
 * To translate: update the three es-ES-faq-section-*.json files with translated content.
 */
import section1 from './es-ES-faq-section-1.json';
import section2 from './es-ES-faq-section-2.json';
import section3 from './es-ES-faq-section-3.json';

const esESFAQ = {
  faq: {
    ...section1.faq,
    ...section2.faq,
    ...section3.faq,
  },
};

export default esESFAQ;
