import { db } from '../../../../shared/db.js';
import { hashUserId } from '../../../../shared/hashUtils.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology,
    fetchUserLanguagePreference,
    fetchUserOracleLanguagePreference,
    fetchUserOracleCharacterPreference,
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
            
            if (isTemporary) {
                // FREE TRIAL: Never call the Oracle again — horoscope content persists for the
                // entire trial.  BUT we must stamp created_at_local_date with today's local date
                // so the GET route (which filters by created_at_local_date = today) can find
                // this record without entering a repeated GET→404→generate→stale-data loop.
                const existingLocalDate = existingHoroscopes[0].created_at_local_date;
                const existingDateStr = existingLocalDate instanceof Date
                    ? existingLocalDate.toISOString().split('T')[0]
                    : (existingLocalDate ? String(existingLocalDate).split('T')[0] : null);

                if (existingDateStr !== todayLocalDate) {
                    await db.query(
                        `UPDATE messages SET created_at_local_date = $1 WHERE id = $2`,
                        [todayLocalDate, existingHoroscopes[0].id]
                    );
                }
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
        let astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        const oracleLanguage = await fetchUserOracleLanguagePreference(userId);
        const oracleCharacter = await fetchUserOracleCharacterPreference(userId);

        // Check if user is temporary/trial account
        const isTemporary = await isTemporaryUser(userId);

        // Throw error if user hasn't completed personal info yet
        // Exception: temp users who reached the horoscope via the sign-picker flow
        // (they have astrology data but no personal info — that's fine)
        if (!userInfo && !isTemporary) {
            throw new Error('Please complete your personal information before generating horoscopes');
        }
        
        // Throw error if user hasn't completed astrology setup yet.
        // Exception: temp users who have a zodiac sign (e.g. from the sign-picker) but whose
        // astrology_data object is missing due to a timing/scaffold edge case — synthesise
        // minimal data from the sign so generation can proceed rather than returning 500.
        if (!astrologyInfo?.astrology_data) {
            if (isTemporary && astrologyInfo?.zodiac_sign) {
                // Build a minimal stand-in so the horoscope prompt has a sun sign at minimum
                astrologyInfo = {
                    ...astrologyInfo,
                    astrology_data: {
                        sun_sign:      astrologyInfo.zodiac_sign,
                        sun_degree:    0,
                        moon_sign:     null,
                        moon_degree:   null,
                        rising_sign:   null,
                        rising_degree: null,
                        calculated_at: new Date().toISOString(),
                    },
                };
            } else {
                throw new Error('Please complete your birth chart information before generating horoscopes');
            }
        }
        
        // Get current astronomical context (planets, moon phase, etc.)
        const astronomicalContext = await getAstronomicalContext();
        
        // Get oracle system prompt — uses oracleLanguage (response language) and oracleCharacter (persona)
        const baseSystemPrompt = getOracleSystemPrompt(isTemporary, oracleLanguage, oracleCharacter);
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
Reference their Sun sign (core identity), Natal Moon sign (emotional nature), and Rising sign (how they appear to the world).
Focus on practical guidance blended with cosmic timing.
Include crystal recommendations aligned with their chart and this ${range} period.
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
            
            // Call Oracle - response is already in user's preferred language
            const oracleResponses = await callOracle(systemPrompt, [], horoscopePrompt, true);
            
            // Generate mood, lucky color, and lucky number
            const moods = ['Energetic', 'Reflective', 'Optimistic', 'Contemplative', 'Adventurous', 'Peaceful', 'Focused', 'Creative'];
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9', '#A29BFE', '#FD79A8'];
            const mood = moods[Math.floor(Math.random() * moods.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const luckyNumber = Math.floor(Math.random() * 99) + 1;
            
            // Store horoscope in database (already in user's language)
            const horoscopeDataFull = {
                text: oracleResponses.full,
                range: range,
                generated_at: generatedAt,
                zodiac_sign: astrologyInfo.zodiac_sign,
                mood: mood,
                color: color,
                luckyNumber: luckyNumber
            };
            
            const horoscopeDataBrief = { 
                text: oracleResponses.brief, 
                range: range, 
                generated_at: generatedAt, 
                zodiac_sign: astrologyInfo.zodiac_sign,
                mood: mood,
                color: color,
                luckyNumber: luckyNumber
            };
            
            // Store message (no translation needed - response is already in user's language)
            
            const storeResult = await storeMessage(
                userId, 
                'horoscope', 
                horoscopeDataFull,
                horoscopeDataBrief,
                null,           // no languageCode needed
                null,           // no contentFullLang needed
                null,           // no contentBriefLang needed
                range,          // horoscopeRange
                null,           // moonPhase
                null,           // contentType
                todayLocalDate,
                generatedAt,    // createdAtLocalTimestamp - use local timezone timestamp
                oracleCharacter
            );
            
            // SSE notifications removed - synchronous processing like chat
            // No Redis required for immediate response
            
        } catch (err) {
            console.error(`[HOROSCOPE-HANDLER] ERROR generating ${range} horoscope:`, err.message);
            console.error(`[HOROSCOPE-HANDLER] ERROR stack:`, err.stack);
            await logErrorFromCatch(err, 'horoscope-handler', `Error generating ${range} horoscope for user ${userId}`);
            throw err; // Rethrow so the outer handler can propagate it
        }
        
    } catch (err) {
        console.error('[HOROSCOPE-HANDLER] ERROR in main handler:', err.message);
        console.error('[HOROSCOPE-HANDLER] ERROR stack:', err.stack);
        await logErrorFromCatch(err, 'horoscope-handler', `Error generating horoscopes for user ${userId}`);
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
        prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree || 0}°) - Core Identity, Life Purpose\n`;
        if (astro.moon_sign) prompt += `- Natal Moon Sign: ${astro.moon_sign} (${astro.moon_degree || 0}°) - Inner Emotional World, Needs, Instincts\n`;
        if (astro.rising_sign) prompt += `- Rising Sign/Ascendant: ${astro.rising_sign} (${astro.rising_degree || 0}°) - How they appear to others, First Impression\n`;
        if (userInfo) {
            if (userInfo.birth_city || userInfo.birth_country) {
                prompt += `- Birth Location: ${[userInfo.birth_city, userInfo.birth_province, userInfo.birth_country].filter(Boolean).join(', ') || 'Unknown'}\n`;
            }
            prompt += `- Birth Time: ${userInfo.birth_time || 'Unknown'}\n`;
        }
        if (astro.venus_sign) prompt += `- Venus Sign: ${astro.venus_sign} (${astro.venus_degree}°) - Love, Attraction, Values\n`;
        if (astro.mars_sign) prompt += `- Mars Sign: ${astro.mars_sign} (${astro.mars_degree}°) - Action, Drive, Passion\n`;
        if (astro.mercury_sign) prompt += `- Mercury Sign: ${astro.mercury_sign} (${astro.mercury_degree}°) - Communication, Thinking Style\n`;
    } else if (astro.name) {
        prompt += `Sun Sign: ${astro.name}\n`;
    }
    
    // ADD CURRENT ASTRONOMICAL POSITIONS
    if (astronomicalContext.success) {
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
