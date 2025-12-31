/**
 * Zodiac Signs Language-Specific Module Loader
 * Dynamically imports zodiac data based on selected language
 * Falls back to English if language not available
 */

// Map of supported language codes to their import functions
const languageModules = {
  'en-US': () => import('./ZodiacSigns.en-US.js'),
  'en-GB': () => import('./ZodiacSigns.en-US.js'), // Uses English US as fallback
  'es-ES': () => import('./ZodiacSigns.es-ES.js'),
  'fr-FR': () => import('./ZodiacSigns.fr-FR.js'),
  'de-DE': () => import('./ZodiacSigns.de-DE.js'),
  'it-IT': () => import('./ZodiacSigns.it-IT.js'),
  'pt-BR': () => import('./ZodiacSigns.pt-BR.js'),
  'ja-JP': () => import('./ZodiacSigns.ja-JP.js'),
  'zh-CN': () => import('./ZodiacSigns.zh-CN.js'),
};

/**
 * Dynamically load zodiac signs for specified language
 * @param {string} languageCode - Language code (e.g., 'en-US', 'es-ES')
 * @returns {Promise<Object>} Zodiac signs data object
 */
export async function loadZodiacSignsForLanguage(languageCode) {
  try {
    // Get the import function for this language, fallback to English
    const importFn = languageModules[languageCode] || languageModules['en-US'];
    
    // Dynamically import the module
    const module = await importFn();
    
    // Return the zodiacSigns object
    return module.zodiacSigns;
  } catch (error) {
    console.error(`Error loading zodiac signs for language ${languageCode}:`, error);
    
    // Fallback to English
    try {
      const fallbackModule = await languageModules['en-US']();
      return fallbackModule.zodiacSigns;
    } catch (fallbackError) {
      console.error('Failed to load English fallback zodiac signs:', fallbackError);
      throw new Error('Unable to load zodiac data');
    }
  }
}

/**
 * Get list of supported languages for zodiac data
 * @returns {string[]} Array of language codes
 */
export function getSupportedLanguages() {
  return Object.keys(languageModules);
}

// For backwards compatibility, also export a synchronous version using require
// This won't work with async imports, but we provide it for reference
export function isLanguageSupported(languageCode) {
  return languageCode in languageModules;
}
