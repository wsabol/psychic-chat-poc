/**
 * FAQ Translations - Japanese (JP) - Web
 *
 * Assembled from section files for easier translation management.
 * To translate: update the three ja-JP-faq-section-*.json files with translated content.
 */
import section1 from './ja-JP-faq-section-1.json';
import section2 from './ja-JP-faq-section-2.json';
import section3 from './ja-JP-faq-section-3.json';

const jaJPFAQ = {
  faq: {
    ...section1.faq,
    ...section2.faq,
    ...section3.faq,
  },
};

export default jaJPFAQ;
