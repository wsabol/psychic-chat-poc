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
import { getAstronomicalContext, formatPlanetsForPrompt } from '../utils/astronomicalContext.js';
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
        
        // Get current astronomical context (planets, moon phase, etc.)
        const astronomicalContext = await getAstronomicalContext();

        for (const currentRange of [range]) {
            try {
                const horoscopePrompt = buildHoroscopePrompt(userInfo, astrologyInfo, currentRange, userGreeting, astronomicalContext);
                
                const systemPrompt = baseSystemPrompt + `

SPECIAL REQUEST - HOROSCOPE GENERATION:
Generate a rich, personalized ${currentRange} horoscope addressing the user as "Dear ${userGreeting}" based on their birth chart and current cosmic energy.
Do NOT keep it brief - provide meaningful depth (3-4 paragraphs minimum).
Reference their Sun sign (core identity), Natal Moon sign (emotional nature), and Rising sign (how they appear to the world).
Focus on practical guidance blended with cosmic timing.
Include crystal recommendations aligned with their chart and this ${currentRange} period.
Make it deeply personal and specific to their astrological signature.
Do NOT include tarot cards in this response - this is purely astrological guidance enriched by their unique birth chart.

CRITICAL DISTINCTION — NATAL BIRTH CHART vs. TODAY'S TRANSIT POSITIONS:
- The "NATAL BIRTH CHART" section lists permanent planetary positions fixed at the moment of birth. These never change.
- The "TODAY'S CURRENT TRANSIT POSITIONS" section lists where planets are in the sky RIGHT NOW. These change daily.
- The user's Natal Moon Sign describes their core emotional nature — it is FIXED and does NOT indicate where the Moon is today.
- When referencing today's lunar energy or the Moon's current influence, ALWAYS use the TRANSIT Moon (TODAY'S SKY) position.
- NEVER write "the Moon is in [Natal Moon Sign]" as a statement about today's sky — that would be factually incorrect.
- Example: If Natal Moon = Sagittarius and Transit Moon (today) = Aries, write "With the Moon transiting Aries today..." NOT "The Moon in Sagittarius today..."

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
 * Build horoscope prompt with user context and REAL astronomical data
 */
function buildHoroscopePrompt(userInfo, astrologyInfo, range, userGreeting, astronomicalContext) {
    const astro = astrologyInfo.astrology_data;
    let prompt = `Generate a personalized ${range} horoscope for ${userGreeting}:\n\n`;
    
    if (astro.sun_sign) {
        prompt += `NATAL BIRTH CHART (permanent positions fixed at birth — NOT today's sky):\n`;
        prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity, Life Purpose\n`;
        prompt += `- Natal Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Inner Emotional World, Needs, Instincts\n`;
        prompt += `- Rising Sign/Ascendant: ${astro.rising_sign} (${astro.rising_degree}°) - How they appear to others, First Impression\n`;
        prompt += `- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}\n`;
        prompt += `- Birth Time: ${userInfo.birth_time || 'Unknown'}\n`;
        if (astro.venus_sign) prompt += `- Venus Sign: ${astro.venus_sign} (${astro.venus_degree}°) - Love, Attraction, Values\n`;
        if (astro.mars_sign) prompt += `- Mars Sign: ${astro.mars_sign} (${astro.mars_degree}°) - Action, Drive, Passion\n`;
        if (astro.mercury_sign) prompt += `- Mercury Sign: ${astro.mercury_sign} (${astro.mercury_degree}°) - Communication, Thinking Style\n`;
    } else if (astro.name) {
        prompt += `Sun Sign: ${astro.name}\n`;
    }

    // ADD CURRENT ASTRONOMICAL POSITIONS (real-time from Lambda)
    if (astronomicalContext && astronomicalContext.success) {
        prompt += `\nTODAY'S CURRENT TRANSIT POSITIONS (real-time sky — NOT birth chart, changes daily):\n`;
        prompt += `Moon Phase: ${astronomicalContext.currentMoonPhase}\n`;
        if (astronomicalContext.moonPosition) {
            prompt += `TRANSIT Moon (TODAY's sky): ${astronomicalContext.moonPosition.degree}° ${astronomicalContext.moonPosition.sign}${astronomicalContext.moonPosition.retrograde ? ' ♻️ RETROGRADE' : ''}\n`;
        }
        prompt += `\nCurrent Planetary Transits (today's sky positions):\n`;
        prompt += formatPlanetsForPrompt(astronomicalContext.currentPlanets) + '\n';
    }
    
    prompt += `\nCONTEXT FOR THIS ${range.toUpperCase()}:\n`;
    switch (range.toLowerCase()) {
        case 'daily':
            prompt += `- What energies are prominent TODAY for this person?\n`;
            prompt += `- How do today's ACTUAL transit positions (listed under TODAY'S CURRENT TRANSIT POSITIONS above) interact with their natal chart?\n`;
            prompt += `- What actions or reflections would be most valuable right now?\n`;
            prompt += `- How does the TRANSIT Moon (TODAY's sky position) affect their emotional state? Use the TRANSIT Moon sign, not the Natal Moon Sign.\n`;
            prompt += `- What crystals or practices would support them today?\n`;
            break;
        case 'weekly':
            prompt += `- What themes are emerging THIS WEEK?\n`;
            prompt += `- How do the CURRENT TRANSIT positions (listed under TODAY'S CURRENT TRANSIT POSITIONS above) affect their trajectory?\n`;
            prompt += `- Which areas of life (relationship, career, health, spiritual growth) are most activated?\n`;
            prompt += `- What should they focus on or prepare for?\n`;
            prompt += `- How can they align with the cosmic flow?\n`;
            break;
    }
    
    prompt += `\nPROVIDE A RICH, PERSONALIZED READING that:\n`;
    prompt += `- Addresses them directly by name\n`;
    prompt += `- References their natal Sun, Natal Moon Sign, and Rising signs for character depth\n`;
    prompt += `- Uses the ACTUAL current TRANSIT planetary positions (from TODAY'S CURRENT TRANSIT POSITIONS) for today's guidance — not the natal positions\n`;
    prompt += `- Clearly distinguishes natal chart traits from today's transit energies\n`;
    prompt += `- Explains how real transits interact with their natal chart\n`;
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

