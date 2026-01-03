/**
 * Local Translation using google-translate-api
 * Fast, offline translation without OpenAI API calls
 * Used for horoscope and content translation
 */

// Map our language codes to Google Translate language codes
const LANGUAGE_MAP = {
  'en-US': 'en',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'it-IT': 'it',
  'pt-BR': 'pt',
  'ja-JP': 'ja',
  'zh-CN': 'zh-cn'
};

/**
 * Translate text to target language using local translator
 * Fast, no API calls needed
 * @param {string} text - Text to translate (can be HTML)
 * @param {string} targetLanguage - Target language code (e.g., 'es-ES')
 * @returns {Promise<string>} Translated text
 */
export async function translateToLanguage(text, targetLanguage) {
  try {
    // Skip if English or no language specified
    if (targetLanguage === 'en-US' || !targetLanguage || !text) {
      return text;
    }

    const targetLangCode = LANGUAGE_MAP[targetLanguage];
    
    // If language not supported, return original text
    if (!targetLangCode) {
      console.warn(`[LOCAL-TRANSLATOR] Unsupported language: ${targetLanguage}, returning English`);
      return text;
    }

    // Dynamic import to avoid issues if library not installed
    try {
      const translate = (await import('google-translate-api')).default;
      
      console.log(`[LOCAL-TRANSLATOR] Translating to ${targetLanguage} (code: ${targetLangCode})...`);
      const result = await translate(text, { to: targetLangCode });
      
      const translatedText = result.text;
      console.log(`[LOCAL-TRANSLATOR] ✓ Translation complete`);
      return translatedText;
    } catch (importErr) {
      console.error('[LOCAL-TRANSLATOR] google-translate-api not installed:', importErr.message);
      console.warn('[LOCAL-TRANSLATOR] Falling back to English');
      return text;
    }
  } catch (err) {
    console.error(`[LOCAL-TRANSLATOR] Error translating to ${targetLanguage}:`, err.message);
    // Return original text on error
    return text;
  }
}

/**
 * Translate content object (which contains {text, range, generated_at, etc})
 * @param {object} contentObj - Content object with text property
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<object>} Translated content object
 */
export async function translateContentObjectLocally(contentObj, targetLanguage) {
  try {
    // Skip if English or no language
    if (targetLanguage === 'en-US' || !targetLanguage || !contentObj) {
      return contentObj;
    }

    // If content is just a string, translate it
    if (typeof contentObj === 'string') {
      return await translateToLanguage(contentObj, targetLanguage);
    }

    // If content is an object with text property
    if (contentObj && typeof contentObj === 'object' && contentObj.text) {
      const translatedText = await translateToLanguage(contentObj.text, targetLanguage);
      return {
        ...contentObj,
        text: translatedText
      };
    }

    return contentObj;
  } catch (err) {
    console.error('[LOCAL-TRANSLATOR] Error translating content object:', err.message);
    return contentObj;
  }
}
