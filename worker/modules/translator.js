import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Translate oracle/tarot/astrology content to target language
 * Preserves HTML structure and mystical terminology
 */
export async function translateContent(text, targetLanguage = 'en-US') {
    try {
        if (targetLanguage === 'en-US' || !targetLanguage) {
            return text;
        }

        const languageNames = {
            'es-ES': 'Spanish',
            'en-GB': 'British English',
            'fr-FR': 'French',
            'de-DE': 'German',
            'it-IT': 'Italian',
            'pt-BR': 'Brazilian Portuguese',
            'ja-JP': 'Japanese',
            'zh-CN': 'Simplified Chinese'
        };

        const targetLangName = languageNames[targetLanguage] || 'English';

        const translationCompletion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a professional mystical translator. Translate the following oracle/tarot/astrology reading into ${targetLangName}. 
                    IMPORTANT: 
                    - Maintain all HTML tags exactly as they are
                    - Only translate text content inside tags, never the tags themselves
                    - Preserve all mystical terminology accurately
                    - Keep the same tone and spiritual essence
                    - Do NOT translate tarot card names or astrological signs
                    - Preserve crystal names and minerals in their common ${targetLangName} equivalents
                    Output: Valid HTML only, same structure as input`
                },
                {
                    role: "user",
                    content: `Translate this reading into ${targetLangName}:\n\n${text}`
                }
            ]
        });

        return translationCompletion.choices[0]?.message?.content || text;
    } catch (err) {
        console.error(`[TRANSLATOR] Error translating to ${targetLanguage}:`, err);
        // Return original text on translation error
        return text;
    }
}

/**
 * Translate content object (which contains {text, cards} structure)
 */
export async function translateContentObject(contentObj, targetLanguage = 'en-US') {
    try {
        if (targetLanguage === 'en-US' || !contentObj) {
            return contentObj;
        }

        // If content is just a string, translate it
        if (typeof contentObj === 'string') {
            return await translateContent(contentObj, targetLanguage);
        }

        // If content is an object with text property
        if (contentObj && typeof contentObj === 'object' && contentObj.text) {
            const translatedText = await translateContent(contentObj.text, targetLanguage);
            return {
                ...contentObj,
                text: translatedText
            };
        }

        return contentObj;
    } catch (err) {
        console.error('[TRANSLATOR] Error translating content object:', err);
        return contentObj;
    }
}
