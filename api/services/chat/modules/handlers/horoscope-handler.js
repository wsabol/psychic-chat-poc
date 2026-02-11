import { db } from '../../../../shared/db.js';
import { hashUserId } from '../../../../shared/hashUtils.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology,
    fetchUserLanguagePreference,
    fetchUserOracleLanguagePreference,
    isTemporaryUser,
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage } from '../messages.js';
import { getUserTimezone, getLocalDateForTimezone, getLocalTimestampForTimezone, needsRegeneration } from '../utils/timezoneHelper.js';
import { getAstronomicalContext, formatPlanetsForPrompt } from '../utils/astronomicalContext.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

/**
 * Generate horoscopes for the user based on local timezone date
 * Checks if already generated for user's local date (not UTC)
 * Responses are generated directly in user's preferred language (NO TRANSLATION!)
 */
export async function generateHoroscope(userId, range = 'daily') {
    try {
        const userIdHash = hashUserId(userId);
        
        // Get user's timezone and today's local date
        const userTimezone = await getUserTimezone(userIdHash);
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
        // Check if THIS SPECIFIC RANGE was already generated for today (in user's timezone)
        const { rows: existingHoroscopes } = await db.query(
            `SELECT id, created_at_local_date FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'horoscope' 
             AND horoscope_range = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [userIdHash, range]
        );
        
        if (existingHoroscopes.length > 0) {
            // Check if user is temporary/trial account FIRST
            const isTemporary = await isTemporaryUser(userId);
            
            // FREE TRIAL: Never regenerate - horoscope persists for entire trial
            if (isTemporary) {
                return;
            }
            
            // REGULAR USERS: Check if regeneration needed based on date
            const createdAtLocalDate = existingHoroscopes[0].created_at_local_date;
            const createdDateStr = createdAtLocalDate instanceof Date 
                ? createdAtLocalDate.toISOString().split('T')[0]
                : String(createdAtLocalDate).split('T')[0];
            
            const needsRegen = needsRegeneration(createdDateStr, todayLocalDate);
            if (!needsRegen) {
                return;
            }
        }
        
        // Fetch user context
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        const oracleLanguage = await fetchUserOracleLanguagePreference(userId);
        
                // Skip if user hasn't completed personal info yet
        if (!userInfo) {
            return;
        }
        
        // Skip if user hasn't completed astrology setup yet (will be generated once they do)
        if (!astrologyInfo?.astrology_data) {
            return;
        }
        
        // Check if user is temporary/trial account
        const isTemporary = await isTemporaryUser(userId);
        
        // Get current astronomical context (planets, moon phase, etc.)
        const astronomicalContext = await getAstronomicalContext();
        
        // Get oracle system prompt with ORACLE LANGUAGE SUPPORT
        // Oracle response uses oracleLanguage (can be regional variant), page UI uses userLanguage
        const baseSystemPrompt = getOracleSystemPrompt(isTemporary, oracleLanguage);
        const userGreeting = getUserGreeting(userInfo, userId, isTemporary);
        // CRITICAL FIX: Use user's local timezone for generated_at timestamp
        const generatedAt = getLocalTimestampForTimezone(userTimezone);
        
        // Generate the horoscope
        try {
            const horoscopePrompt = buildHoroscopePrompt(userInfo, astrologyInfo, range, userGreeting, astronomicalContext);
            
            const systemPrompt = baseSystemPrompt + `

SPECIAL REQUEST - HOROSCOPE GENERATION:
Generate a rich, personalized ${range} horoscope addressing the user as "Dear ${userGreeting}" based on their birth chart and current cosmic energy.
Do NOT keep it brief - provide meaningful depth (3-4 paragraphs minimum).
Reference their Sun sign (core identity), Moon sign (emotional nature), and Rising sign (how they appear to the world).
Focus on practical guidance blended with cosmic timing.
Include crystal recommendations aligned with their chart and this ${range} period.
Make it deeply personal and specific to their astrological signature.
Do NOT include tarot cards in this response - this is purely astrological guidance enriched by their unique birth chart.
`;
            
            // Call Oracle - response is already in user's preferred language
            const oracleResponses = await callOracle(systemPrompt, [], horoscopePrompt, true);
            
            // Store horoscope in database (already in user's language)
            const horoscopeDataFull = {
                text: oracleResponses.full,
                range: range,
                generated_at: generatedAt,
                zodiac_sign: astrologyInfo.zodiac_sign
            };
            
            const horoscopeDataBrief = { 
                text: oracleResponses.brief, 
                range: range, 
                generated_at: generatedAt, 
                zodiac_sign: astrologyInfo.zodiac_sign 
            };
            
                                    // Store message (no translation needed - response is already in user's language)
            await storeMessage(
                userId, 
                'horoscope', 
                horoscopeDataFull,
                horoscopeDataBrief,
                null,  // no languageCode needed
                null,  // no contentFullLang needed
                null,  // no contentBriefLang needed
                range,  // horoscopeRange
                null,   // moonPhase
                null,   // contentType
                todayLocalDate,
                generatedAt  // createdAtLocalTimestamp - use local timezone timestamp
            );
            
            // Publish SSE notification via Redis
            try {
                const { getClient } = await import('../../../../shared/queue.js');
                const redisClient = await getClient();
                await redisClient.publish(
                    `response-ready:${userId}`,
                    JSON.stringify({
                        type: 'message_ready',
                        role: 'horoscope',
                        range: range,
                        timestamp: new Date().toISOString()
                    })
                );
            } catch (redisErr) {
                logErrorFromCatch(redisErr, '[HOROSCOPE-HANDLER] Failed to publish SSE notification');
                // Don't throw - horoscope was saved successfully
            }
            
        } catch (err) {
            logErrorFromCatch(err, `[HOROSCOPE-HANDLER] Error generating ${range} horoscope`);
        }
        
    } catch (err) {
        logErrorFromCatch(err, '[HOROSCOPE-HANDLER] Error generating horoscopes');
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
    
    // ADD CURRENT ASTRONOMICAL POSITIONS
    if (astronomicalContext.success) {
        prompt += `\nCURRENT ASTRONOMICAL POSITIONS (calculated, not fictional):\n`;
        prompt += `Moon Phase: ${astronomicalContext.currentMoonPhase}\n`;
        if (astronomicalContext.moonPosition) {
            prompt += `Moon: ${astronomicalContext.moonPosition.degree}° ${astronomicalContext.moonPosition.sign}\n`;
        }
        prompt += `\nCurrent Planetary Transits:\n`;
        prompt += formatPlanetsForPrompt(astronomicalContext.currentPlanets) + '\n';
    }
    
    prompt += `\nCONTEXT FOR THIS ${range.toUpperCase()}:\n`;
    
    switch (range.toLowerCase()) {
        case 'daily':
            prompt += `- What energies are prominent TODAY for this person?\n`;
            prompt += `- How do today's ACTUAL transits (listed above) interact with their natal chart?\n`;
            prompt += `- What actions or reflections would be most valuable right now?\n`;
            prompt += `- How does the current Moon position affect their emotional state?\n`;
            prompt += `- What crystals or practices would support them today?\n`;
            break;
        case 'weekly':
            prompt += `- What themes are emerging THIS WEEK?\n`;
            prompt += `- How do current REAL planetary positions (listed above) affect their trajectory?\n`;
            prompt += `- Which areas of life (relationship, career, health, spiritual growth) are most activated?\n`;
            prompt += `- What should they focus on or prepare for?\n`;
            prompt += `- How can they align with the cosmic flow?\n`;
            break;
    }
    
    prompt += `\nPROVIDE A RICH, PERSONALIZED READING that:\n`;
    prompt += `- Addresses them directly by name\n`;
    prompt += `- References their Sun, Moon, and Rising signs\n`;
    prompt += `- Uses the ACTUAL current planetary positions provided above (not fictional ones)\n`;
    prompt += `- Explains how real transits interact with their natal chart\n`;
    prompt += `- Incorporates their complete birth chart nuances\n`;
    prompt += `- Gives specific, actionable guidance\n`;
    prompt += `- Honors the unique complexity of their chart`;
    
    return prompt;
}

/**
 * Check if message is a horoscope request
 */
export function isHoroscopeRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('horoscope');
}

/**
 * Extract horoscope range from message
 */
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
