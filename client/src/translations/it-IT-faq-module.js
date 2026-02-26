/**
 * FAQ Translations - Italian (IT) - Web
 *
 * Assembled from section files for easier translation management.
 * To translate: update the three it-IT-faq-section-*.json files with translated content.
 */
import section1 from './it-IT-faq-section-1.json';
import section2 from './it-IT-faq-section-2.json';
import section3 from './it-IT-faq-section-3.json';

const itITFAQ = {
  faq: {
    ...section1.faq,
    ...section2.faq,
    ...section3.faq,
  },
};

export default itITFAQ;
