/**
 * Simple Translation using MyMemory API
 * Free, no authentication, fast
 * Used for horoscope translations
 */

// Map our language codes to MyMemory language codes
const LANGUAGE_MAP = {
  'en-US': 'en',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'it-IT': 'it',
  'pt-BR': 'pt-BR',
  'ja-JP': 'ja',
  'zh-CN': 'zh-CN'
};

/**
 * Translate text to target language using MyMemory API
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code (e.g., 'es-ES')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLanguage) {
  try {
    // Skip if English or no language specified
    if (targetLanguage === 'en-US' || !targetLanguage || !text) {
      return text;
    }

    const targetLangCode = LANGUAGE_MAP[targetLanguage];
    
    // If language not supported, return original text
    if (!targetLangCode) {
      console.warn(`[SIMPLE-TRANSLATOR] Unsupported language: ${targetLanguage}, returning English`);
      return text;
    }

    console.log(`[SIMPLE-TRANSLATOR] Translating to ${targetLanguage}...`);
    
    // Use MyMemory Translation API (free, no auth needed)
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLangCode}`;
    
    const response = await fetch(url, {
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.ok) {
      console.error(`[SIMPLE-TRANSLATOR] API error: ${response.status}`);
      return text;
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData.translatedText) {
      const translatedText = data.responseData.translatedText;
      console.log(`[SIMPLE-TRANSLATOR] ✓ Translation complete`);
      return translatedText;
    } else {
      console.error('[SIMPLE-TRANSLATOR] Translation failed:', data.responseDetails);
      return text;
    }
  } catch (err) {
    console.error(`[SIMPLE-TRANSLATOR] Error translating to ${targetLanguage}:`, err.message);
    // Return original text on error
    return text;
  }
}

/**
 * Translate content object
 * @param {object} contentObj - Content object with text property
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<object>} Translated content object
 */
export async function translateContentObject(contentObj, targetLanguage) {
  try {
    // Skip if English or no language
    if (targetLanguage === 'en-US' || !targetLanguage || !contentObj) {
      return contentObj;
    }

    // If content is just a string, translate it
    if (typeof contentObj === 'string') {
      return await translateText(contentObj, targetLanguage);
    }

    // If content is an object with text property
    if (contentObj && typeof contentObj === 'object' && contentObj.text) {
      const translatedText = await translateText(contentObj.text, targetLanguage);
      return {
        ...contentObj,
        text: translatedText
      };
    }

    return contentObj;
  } catch (err) {
    console.error('[SIMPLE-TRANSLATOR] Error translating content object:', err.message);
    return contentObj;
  }
}
