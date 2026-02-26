/**
 * FAQ Translations - Chinese Simplified (CN) - Web
 *
 * Assembled from section files for easier translation management.
 * To translate: update the three zh-CN-faq-section-*.json files with translated content.
 */
import section1 from './zh-CN-faq-section-1.json';
import section2 from './zh-CN-faq-section-2.json';
import section3 from './zh-CN-faq-section-3.json';

const zhCNFAQ = {
  faq: {
    ...section1.faq,
    ...section2.faq,
    ...section3.faq,
  },
};

export default zhCNFAQ;
