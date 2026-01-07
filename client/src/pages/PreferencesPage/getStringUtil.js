import { translations } from './translations';

/**
 * Creates a getString function that uses embedded translations for instant updates
 * Falls back to TranslationContext for keys not in embedded translations
 */
export const createGetString = (language, t) => {
  return (key) => {
    const lang = language || 'en-US';
    
    // First try embedded translations for instant updates
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    
    // Fallback to TranslationContext
    try {
      return t(key);
    } catch (e) {
      return key;
    }
  };
};
