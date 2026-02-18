import { db } from '../../../../shared/db.js';
import { hashUserId } from '../../../../shared/hashUtils.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology,
    fetchUserLanguagePreference,
    isTemporaryUser,
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage, updateMessageTranslation } from '../messages.js';
import { translateContentObject } from '../simpleTranslator.js';
import { getTodayInUserTimezone, fetchUserTimezonePreference, getCurrentTimeInUserTimezone } from '../utils/timezoneUtils.js';
import { cleanMarkdownCodeFences } from '../utils/cleanMarkdown.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

/**
 * Background async translation function
 * Runs without blocking the main flow
 */
async function translateAndUpdateHoroscope(userId, horoscopeDataFull, horoscopeDataBrief, userLanguage, range) {
    try {
        
        const horoscopeDataFullLang = await translateContentObject(horoscopeDataFull, userLanguage);
        const horoscopeDataBriefLang = await translateContentObject(horoscopeDataBrief, userLanguage);
        
        // VALIDATION: Check if translation succeeded
        if (horoscopeDataFullLang?.text === horoscopeDataFull?.text) {
            return;
        }
        
        
        // Update the horoscope message with translation
        if (updateMessageTranslation && typeof updateMessageTranslation === 'function') {
            await updateMessageTranslation(userId, 'horoscope', horoscopeDataFullLang, horoscopeDataBriefLang, userLanguage, range);
        }
        
        
    } catch (err) {
        logErrorFromCatch(`[HOROSCOPE-ASYNC] Error:`, err.message);
    }
}

/**
 * Generate horoscopes for the user
 * ASYNC TRANSLATION: Stores English immediately, translates in background
 */
export async function generateHoroscope(userId, range = 'daily') {
    try {
        
        // Fetch user's timezone preference
        let userTimezone = await fetchUserTimezonePreference(db, userId);
        if (!userTimezone) {
            userTimezone = 'GMT';
        }
        
        const today = getTodayInUserTimezone(userTimezone);
        
        const userIdHash = hashUserId(userId);
        
        // Check if already generated today
        const { rows: existingHoroscopes } = await db.query(
            `SELECT id FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'horoscope' 
             AND horoscope_range = $2
             AND created_at::date = $3::date 
             LIMIT 1`,
            [userIdHash, range, today]
        );
        
        if (existingHoroscopes.length > 0) {
            return;
        }
        
        // Fetch user context
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        
        if (!userInfo) throw new Error('User personal info not found');
        if (!astrologyInfo?.astrology_data) throw new Error('User astrology data not found');
        
        const isTemporary = await isTemporaryUser(userId);
        const baseSystemPrompt = getOracleSystemPrompt(isTemporary);
        const userGreeting = getUserGreeting(userInfo, userId, isTemporary);
        const generatedAt = new Date().toISOString();
        const userLocalTime = getCurrentTimeInUserTimezone(userTimezone);
        
        for (const currentRange of [range]) {
            try {
                const horoscopePrompt = buildHoroscopePrompt(userInfo, astrologyInfo, currentRange, userGreeting);
                
                const systemPrompt = baseSystemPrompt + `

SPECIAL REQUEST - HOROSCOPE GENERATION:
Generate a rich, personalized ${currentRange} horoscope addressing the user as "Dear ${userGreeting}" based on their birth chart and current cosmic energy.
Do NOT keep it brief - provide meaningful depth (3-4 paragraphs minimum).
Reference their Sun sign (core identity), Moon sign (emotional nature), and Rising sign (how they appear to the world).
Focus on practical guidance blended with cosmic timing.
Include crystal recommendations aligned with their chart and this ${currentRange} period.
Make it deeply personal and specific to their astrological signature.
Do NOT include tarot cards in this response - this is purely astrological guidance enriched by their unique birth chart.

CRITICAL OUTPUT FORMAT OVERRIDE FOR HOROSCOPES:
For horoscope responses ONLY, ignore the HTML formatting rules.
Output your response in PLAIN TEXT with natural paragraph breaks.
Use double line breaks (\\n\\n) between paragraphs for readability.
Do NOT use HTML tags like <h3>, <p>, <strong>, etc.
Do NOT use Markdown formatting like ** or # either.
Write naturally and conversationally as plain text.
Begin directly with "Dear ${userGreeting}" and flow naturally through your guidance.
`;
                
                const oracleResponses = await callOracle(systemPrompt, [], horoscopePrompt, true);
                
                // Prepare horoscope data
                const horoscopeDataFull = {
                    text: cleanMarkdownCodeFences(oracleResponses.full),
                    range: currentRange,
                    generated_at: generatedAt,
                    generated_at_local: userLocalTime.date + ' ' + userLocalTime.time,
                    user_timezone: userTimezone,
                    zodiac_sign: astrologyInfo.zodiac_sign
                };
                
                const horoscopeDataBrief = { 
                    text: cleanMarkdownCodeFences(oracleResponses.brief), 
                    range: currentRange, 
                    generated_at: generatedAt,
                    generated_at_local: userLocalTime.date + ' ' + userLocalTime.time,
                    user_timezone: userTimezone,
                    zodiac_sign: astrologyInfo.zodiac_sign 
                };
                
                // ✨ STORE ENGLISH IMMEDIATELY (no wait for translation)
                await storeMessage(
                    userId, 
                    'horoscope', 
                    horoscopeDataFull, 
                    horoscopeDataBrief,
                    'en-US',
                    null,
                    null,
                    currentRange
                );
                
                // Send "translating" message if needed
                if (userLanguage && userLanguage !== 'en-US') {
                    await storeMessage(
                        userId,
                        'system',
                        { text: `I am now translating your ${currentRange} reading...` },
                        { text: `Translating...` },
                        userLanguage
                    );
                    
                    // ✨ START ASYNC TRANSLATION (fire and forget)
                    translateAndUpdateHoroscope(userId, horoscopeDataFull, horoscopeDataBrief, userLanguage, currentRange)
                        .catch(err => logErrorFromCatch(`[HOROSCOPE-HANDLER] Async error:`, err.message));
                }
                
            } catch (err) {
                logErrorFromCatch(`[HOROSCOPE-HANDLER] Error generating ${currentRange}:`, err.message);
                logErrorFromCatch(`[HOROSCOPE-HANDLER] Stack: ${err.stack}`);
            }
        }
        
    } catch (err) {
        logErrorFromCatch('[HOROSCOPE-HANDLER] Error:', err.message);
        logErrorFromCatch(`[HOROSCOPE-HANDLER] Stack: ${err.stack}`);
        throw err;
    }
}

/**
 * Build horoscope prompt
 */
function buildHoroscopePrompt(userInfo, astrologyInfo, range, userGreeting) {
    const astro = astrologyInfo.astrology_data;
    let prompt = `Generate a personalized ${range} horoscope for ${userGreeting}:\n\n`;
    
    if (astro.sun_sign) {
        prompt += `COMPLETE BIRTH CHART:\n`;
        prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity, Life Purpose\n`;
        prompt += `- Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Inner Emotional World, Needs, Instincts\n`;
        prompt += `- Rising Sign/Ascendant: ${astro.rising_sign} (${astro.rising_degree}°) - How they appear to others, First Impression\n`;
        prompt += `- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}\n`;
        prompt += `- Birth Time: ${userInfo.birth_time || 'Unknown'}\n`;
        if (astro.venus_sign) prompt += `- Venus Sign: ${astro.venus_sign} (${astro.venus_degree}°) - Love, Attraction, Values\n`;
        if (astro.mars_sign) prompt += `- Mars Sign: ${astro.mars_sign} (${astro.mars_degree}°) - Action, Drive, Passion\n`;
        if (astro.mercury_sign) prompt += `- Mercury Sign: ${astro.mercury_sign} (${astro.mercury_degree}°) - Communication, Thinking Style\n`;
    } else if (astro.name) {
        prompt += `Sun Sign: ${astro.name}\n`;
    }
    
    prompt += `\nCONTEXT FOR THIS ${range.toUpperCase()}:\n`;
    switch (range.toLowerCase()) {
        case 'daily':
            prompt += `- What energies are prominent TODAY for this person?\n`;
            prompt += `- How do today's transits interact with their natal chart?\n`;
            prompt += `- What actions or reflections would be most valuable right now?\n`;
            prompt += `- What lunar phase influences are at play?\n`;
            prompt += `- What crystals or practices would support them today?\n`;
            break;
        case 'weekly':
            prompt += `- What themes are emerging THIS WEEK?\n`;
            prompt += `- How do current planetary positions affect their trajectory?\n`;
            prompt += `- Which areas of life (relationship, career, health, spiritual growth) are most activated?\n`;
            prompt += `- What should they focus on or prepare for?\n`;
            prompt += `- How can they align with the cosmic flow?\n`;
            break;
    }
    
    prompt += `\nPROVIDE A RICH, PERSONALIZED READING that:\n`;
    prompt += `- Addresses them directly by name\n`;
    prompt += `- References their Sun, Moon, and Rising signs\n`;
    prompt += `- Incorporates their complete birth chart nuances\n`;
    prompt += `- Gives specific, actionable guidance\n`;
    prompt += `- Honors the unique complexity of their chart`;
    
    return prompt;
}

export function isHoroscopeRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('horoscope');
}

export function extractHoroscopeRange(message) {
    const match = message.match(/horoscope for (\w+)/i);
    if (match && match[1]) {
        const range = match[1].toLowerCase();
        if (['daily', 'weekly'].includes(range)) {
            return range;
        }
    }
    return 'daily';
}

