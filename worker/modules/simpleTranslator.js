/**
 * Simple Translation using MyMemory API
 * Free, no authentication, fast
 * Used for horoscope translations
 * 
 * HANDLES LONG TEXTS: MyMemory has 500 char limit, so long texts are split into sentence chunks
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
 * Split text into sentences for chunking
 */
function splitIntoSentences(text) {
  // Split on sentence boundaries (. ! ?)
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

/**
 * Translate a single chunk using MyMemory API
 */
async function translateChunk(text, targetLangCode) {
  try {
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
      return data.responseData.translatedText;
    } else {
      console.error('[SIMPLE-TRANSLATOR] Translation failed:', data.responseDetails);
      return text;
    }
  } catch (err) {
    console.error('[SIMPLE-TRANSLATOR] Error in translateChunk:', err.message);
    return text;
  }
}

/**
 * Translate text to target language using MyMemory API
 * Handles long texts by chunking into sentences (MyMemory has 500 char limit)
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

    console.log(`[SIMPLE-TRANSLATOR] Translating to ${targetLanguage}... (${text.length} chars)`);
    
    // MyMemory API has 500 char limit - split long text into chunks
    const MAX_CHUNK_SIZE = 450; // Leave 50 char buffer
    
    if (text.length <= MAX_CHUNK_SIZE) {
      // Text is short enough, translate directly
      return await translateChunk(text, targetLangCode);
    }
    
    // Text is too long, split into sentences and batch translate
    console.log(`[SIMPLE-TRANSLATOR] Text exceeds limit, chunking into sentences...`);
    const sentences = splitIntoSentences(text);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    console.log(`[SIMPLE-TRANSLATOR] Split into ${chunks.length} chunks`);
    
    // Translate each chunk
    const translatedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const translated = await translateChunk(chunk, targetLangCode);
      translatedChunks.push(translated);
      // Add small delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    const result = translatedChunks.join(' ');
    console.log(`[SIMPLE-TRANSLATOR] ✓ Translation complete (${result.length} chars)`);
    return result;
    
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
