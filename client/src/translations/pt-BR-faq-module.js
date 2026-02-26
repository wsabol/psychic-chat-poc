/**
 * FAQ Translations - Portuguese (BR) - Web
 *
 * Assembled from section files for easier translation management.
 * To translate: update the three pt-BR-faq-section-*.json files with translated content.
 */
import section1 from './pt-BR-faq-section-1.json';
import section2 from './pt-BR-faq-section-2.json';
import section3 from './pt-BR-faq-section-3.json';

const ptBRFAQ = {
  faq: {
    ...section1.faq,
    ...section2.faq,
    ...section3.faq,
  },
};

export default ptBRFAQ;
