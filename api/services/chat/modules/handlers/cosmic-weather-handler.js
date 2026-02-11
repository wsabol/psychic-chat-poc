import { fetchUserAstrology, fetchUserLanguagePreference, fetchUserOracleLanguagePreference, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { getUserTimezone, getLocalDateForTimezone, getLocalTimestampForTimezone, needsRegeneration } from '../utils/timezoneHelper.js';
import { db } from '../../../shared/db.js';
import { hashUserId } from '../../../shared/hashUtils.js';
import { getAstronomicalContext, formatPlanetsForPrompt } from '../utils/astronomicalContext.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';



export async function generateCosmicWeather(userId) {
    try {
        const userIdHash = hashUserId(userId);
        
        // Get user's timezone and today's local date
        const userTimezone = await getUserTimezone(userIdHash);
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
                // Check if cosmic weather already exists for today (in user's timezone)
        const { rows: existingWeather } = await db.query(
            `SELECT id, created_at_local_date FROM messages WHERE user_id_hash = $1 AND role = 'cosmic_weather' ORDER BY created_at DESC LIMIT 1`,
            [userIdHash]
        );
        
        if (existingWeather.length > 0) {
            const createdAtLocalDate = existingWeather[0].created_at_local_date;
            // Convert to YYYY-MM-DD string if it's a Date object
            const createdDateStr = createdAtLocalDate instanceof Date 
                ? createdAtLocalDate.toISOString().split('T')[0]
                : String(createdAtLocalDate).split('T')[0];
            
            if (!needsRegeneration(createdDateStr, todayLocalDate)) {
                return;
            }
        }
        
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        const oracleLanguage = await fetchUserOracleLanguagePreference(userId);
        
        // Skip if user hasn't completed astrology setup yet (will be generated once they do)
        if (!astrologyInfo?.astrology_data) {
            return;
        }
        
        // Get current astronomical context (planets, moon phase, etc.)
        const astronomicalContext = await getAstronomicalContext();
        if (!astronomicalContext.success) {
            throw new Error('Failed to calculate astronomical context');
        }
        const planets = astronomicalContext.currentPlanets;
        
        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);
        
        // Build detailed planet information with calculated positions and degrees
        const planetsDetailed = formatPlanetsForPrompt(planets);
        
        // Get oracle system prompt with ORACLE LANGUAGE SUPPORT
        // Oracle response uses oracleLanguage (can be regional variant), page UI uses userLanguage
        const systemPrompt = getOracleSystemPrompt(false, oracleLanguage) + `

SPECIAL REQUEST - COSMIC WEATHER:
Generate today's cosmic weather for ${userGreeting} using their complete birth chart and current planetary alignments.
Do NOT keep it brief - provide meaningful depth (3-4 paragraphs minimum).
Reference their Sun sign (identity), Moon sign (emotions), and Rising sign (presentation).
Incorporate how today's planetary movements interact with their natal chart.
Include retrograde effects if any planets are retrograde.
Provide practical guidance for working with today's cosmic energies.
Include crystal or ritual recommendations aligned with their chart and today's planetary weather.
Focus on TODAY's cosmic energies with specific, personal insight.
Do NOT include tarot cards - this is pure astrological forecasting enriched by their unique birth chart.
`;
        
        const prompt = buildCosmicWeatherPrompt(userInfo, astrologyInfo, astronomicalContext, planetsDetailed, userGreeting);
        
                // Call Oracle - response is already in user's preferred language
        const oracleResponses = await callOracle(systemPrompt, [], prompt, true);
        
        // CRITICAL FIX: Use user's local timezone for generated_at timestamp
        const generatedAt = getLocalTimestampForTimezone(userTimezone);
        
        const cosmicWeatherDataFull = {
            text: oracleResponses.full,
            birth_chart: {
                sun_sign: astro.sun_sign,
                sun_degree: astro.sun_degree,
                moon_sign: astro.moon_sign,
                moon_degree: astro.moon_degree,
                rising_sign: astro.rising_sign,
                rising_degree: astro.rising_degree,
                venus_sign: astro.venus_sign,
                venus_degree: astro.venus_degree,
                mars_sign: astro.mars_sign,
                mars_degree: astro.mars_degree,
                mercury_sign: astro.mercury_sign,
                mercury_degree: astro.mercury_degree
            },
            planets: planets,
            generated_at: generatedAt
        };
        
        const cosmicWeatherDataBrief = {
            text: oracleResponses.brief,
            generated_at: generatedAt
        };
        
                                // Store message (no translation needed - response is already in user's language)
        const storeResult = await storeMessage(
            userId, 
            'cosmic_weather', 
            cosmicWeatherDataFull, 
            cosmicWeatherDataBrief,
            null,  // no languageCode needed
            null,  // no contentFullLang needed
            null,  // no contentBriefLang needed
            null,
            null,
            null,
            todayLocalDate,
            generatedAt  // createdAtLocalTimestamp - use local timezone timestamp
        );
        
        // Publish SSE notification via Redis
        try {
            const { redis } = await import('../../shared/queue.js');
            const redisClient = await redis();
            await redisClient.publish(
                `response-ready:${userId}`,
                JSON.stringify({
                    type: 'message_ready',
                    role: 'cosmic_weather',
                    timestamp: new Date().toISOString()
                })
            );
        } catch (redisErr) {
            logErrorFromCatch(redisErr, '[CW-HANDLER] Failed to publish SSE notification');
            // Don't throw - cosmic weather was saved successfully
        }
        
                        } catch (err) {
        logErrorFromCatch(err, '[CW-HANDLER] Cosmic weather generation failed');
        throw err;
    }
}

/**
 * Build comprehensive cosmic weather prompt - let oracle interpret calculated positions
 * Updated to use unified astronomical context
 */
function buildCosmicWeatherPrompt(userInfo, astrologyInfo, astronomicalContext, planetsDetailed, userGreeting) {
    const astro = astrologyInfo.astrology_data;
    
    let prompt = `Generate today's comprehensive cosmic weather for ${userGreeting}:\n\n`;
    
    prompt += `COMPLETE BIRTH CHART:\n`;
    prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity, Life Purpose, Vital Force\n`;
    prompt += `- Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Inner Emotional World, Needs, Subconscious\n`;
    prompt += `- Rising Sign/Ascendant: ${astro.rising_sign} (${astro.rising_degree}°) - How they appear to the world, Personal Magnetism\n`;
    if (astro.venus_sign) prompt += `- Venus Sign: ${astro.venus_sign} (${astro.venus_degree}°) - Love, Values, Attraction, Pleasure\n`;
    if (astro.mars_sign) prompt += `- Mars Sign: ${astro.mars_sign} (${astro.mars_degree}°) - Action, Drive, Passion, Assertion\n`;
    if (astro.mercury_sign) prompt += `- Mercury Sign: ${astro.mercury_sign} (${astro.mercury_degree}°) - Communication, Thinking Style, Mental Processing\n`;
    prompt += `- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}\n\n`;
    
    prompt += `TODAY'S CALCULATED ASTRONOMICAL POSITIONS (use your astrological knowledge to interpret):\n`;
    prompt += `Moon Phase: ${astronomicalContext.currentMoonPhase}\n`;
    if (astronomicalContext.moonPosition) {
        prompt += `Current Moon: ${astronomicalContext.moonPosition.degree}° ${astronomicalContext.moonPosition.sign}\n`;
    }
    prompt += `\nPlanetary Positions:\n`;
    prompt += planetsDetailed + '\n\n';
    
    prompt += `ORACLE INSTRUCTIONS:\n`;
    prompt += `You are a mystical oracle interpreting the unique cosmic weather created by today's specific planetary positions and degrees.\n`;
    prompt += `Each day is completely unique based on where the planets are positioned - use your deep astrological knowledge to interpret what THESE specific positions mean.\n`;
    prompt += `- Show how each planet's current position (degree in sign) interacts with their natal Sun, Moon, and Rising signs\n`;
    prompt += `- Identify which life areas (relationships, career, health, creativity, spirituality) are most activated by today's specific transits\n`;
    prompt += `- Explain retrograde influences if applicable and what they uniquely mean for this person's chart\n`;
    prompt += `- Provide 3-4 paragraphs of rich, personalized insight that could NOT be the same as any other day (due to different planetary positions)\n`;
    prompt += `- Address them directly by name and make this deeply personal and unique to TODAY's cosmic moment\n`;
    prompt += `- Include practical guidance for working harmoniously with today's energies\n`;
    prompt += `- Suggest crystals or practices that align with their chart and today's specific planetary weather\n`;
    prompt += `- Be poetic, mystical, and reveal your deep astrological knowledge through interpretation, not through pre-written meanings\n`;
    prompt += `- Show how today's transits either support or challenge their natal chart strengths\n`;
    prompt += `- Make specific references to their unique astrological signature and what today's planets mean for THEM specifically\n`;
    prompt += `- Remember: each day's reading must be unique to the specific planetary degrees and positions for that day`;
    
    return prompt;
}

export function isCosmicWeatherRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('cosmic weather');
}
