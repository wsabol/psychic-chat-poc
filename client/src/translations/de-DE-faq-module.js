/**
 * FAQ Translations - German (DE) - Web
 *
 * Assembled from section files for easier translation management.
 * To translate: update the three de-DE-faq-section-*.json files with translated content.
 */
import section1 from './de-DE-faq-section-1.json';
import section2 from './de-DE-faq-section-2.json';
import section3 from './de-DE-faq-section-3.json';

const deDEFAQ = {
  faq: {
    ...section1.faq,
    ...section2.faq,
    ...section3.faq,
  },
};

export default deDEFAQ;
