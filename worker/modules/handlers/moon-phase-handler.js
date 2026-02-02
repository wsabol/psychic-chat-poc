import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology,
    fetchUserLanguagePreference,
    fetchUserOracleLanguagePreference,
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage } from '../messages.js';
import { getUserTimezone, getLocalDateForTimezone, needsRegeneration } from '../utils/timezoneHelper.js';
import { getAstronomicalContext, formatPlanetsForPrompt } from '../utils/astronomicalContext.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Generate personalized moon phase commentary based on user's birth chart
 * Responses are generated directly in user's preferred language (NO TRANSLATION!)
 */
export async function generateMoonPhaseCommentary(userId, phase) {
    try {
        // If phase is "current", get the actual current moon phase
        let actualPhase = phase;
        if (phase === 'current') {
            try {
                const { getCurrentMoonPhase } = await import('../astrology.js');
                const moonData = await getCurrentMoonPhase();
                actualPhase = moonData.phase || 'fullMoon';
            } catch (err) {
                logErrorFromCatch('[MOON-PHASE] Failed to get current phase, using fullMoon as fallback');
                actualPhase = 'fullMoon';
            }
        }
        
        const userIdHash = hashUserId(userId);
        
        // Get user timezone and today's local date
        const userTimezone = await getUserTimezone(userIdHash);
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
        // Check if THIS SPECIFIC PHASE was already generated for today (in user's timezone)
        // Use actualPhase to check (not "current")
        const { rows: existingMoonPhase } = await db.query(
            `SELECT id, created_at_local_date FROM messages WHERE user_id_hash = $1 AND role = 'moon_phase' AND moon_phase = $2 ORDER BY created_at DESC LIMIT 1`,
            [userIdHash, actualPhase]
        );
        
        if (existingMoonPhase.length > 0) {
            const createdAtLocalDate = existingMoonPhase[0].created_at_local_date;
            if (!needsRegeneration(createdAtLocalDate, todayLocalDate)) {
                return;
            }
        } else {
        }
        
        // Fetch user context
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        const oracleLanguage = await fetchUserOracleLanguagePreference(userId);
        
        if (!userInfo) {
            throw new Error('User personal info not found');
        }
        
                if (!astrologyInfo?.astrology_data) {
            // Skip users without astrology data (not an error - they just haven't completed birth info yet)
            return;
        }
        
        // Get current astronomical context (planets, moon phase, etc.)
        const astronomicalContext = await getAstronomicalContext();
        
        // Get user greeting first (uses familiar_name if available)
        const userGreeting = getUserGreeting(userInfo, userId);
        
        // Build moon phase prompt with userGreeting already obtained above
        // Use actualPhase for the prompt and storage
        const moonPhasePrompt = buildMoonPhasePrompt(userInfo, astrologyInfo, actualPhase, userGreeting, astronomicalContext);
        
        // Get oracle system prompt with ORACLE LANGUAGE SUPPORT
        // Oracle response uses oracleLanguage (can be regional variant), page UI uses userLanguage
        const baseSystemPrompt = getOracleSystemPrompt(false, oracleLanguage);
        
        const systemPrompt = baseSystemPrompt + `

SPECIAL REQUEST - MOON PHASE INSIGHT:
Generate a rich, personalized insight about how the current ${actualPhase} moon phase affects ${userGreeting} based on their complete birth chart.
Do NOT keep it brief - provide meaningful depth (3-4 paragraphs minimum).
Incorporate specific references to their Sun sign (core identity), Moon sign (emotional nature), and Rising sign (how they present to the world).
Address them directly and personally.
Focus on how this specific phase influences them emotionally, spiritually, and practically.
Include crystal recommendations aligned with their chart and this lunar phase.
Do NOT include tarot cards - this is purely lunar + astrological insight enriched by their unique birth chart.
`;
        
        // Call Oracle - response is already in user's preferred language
        const oracleResponses = await callOracle(systemPrompt, [], moonPhasePrompt, true);
        
        // Store moon phase commentary (already in user's language)
        // Use actualPhase for storage so it matches what frontend requests
        const moonPhaseData = {
            text: oracleResponses.full,
            phase: actualPhase,
            generated_at: new Date().toISOString(),
            zodiac_sign: astrologyInfo.zodiac_sign
        };
        
        const moonPhaseDataBrief = { 
            text: oracleResponses.brief, 
            phase: actualPhase, 
            generated_at: new Date().toISOString(), 
            zodiac_sign: astrologyInfo.zodiac_sign 
        };
        
        // Store message (no translation needed - response is already in user's language)
        // Store with actualPhase so frontend can find it
        await storeMessage(
            userId,
            'moon_phase',
            moonPhaseData,
            moonPhaseDataBrief,
            null,  // no languageCode needed
            null,  // no contentFullLang needed
            null,  // no contentBriefLang needed
            null,  // horoscopeRange
            actualPhase, // moonPhase - use actualPhase not "current"
            null,  // contentType
            todayLocalDate
        );
        
        // Publish SSE notification via Redis
        try {
            const { redis } = await import('../../shared/queue.js');
            const redisClient = await redis();
            await redisClient.publish(
                `response-ready:${userId}`,
                JSON.stringify({
                    type: 'message_ready',
                    role: 'moon_phase',
                    phase: actualPhase,
                    timestamp: new Date().toISOString()
                })
            );
        } catch (redisErr) {
            logErrorFromCatch(redisErr, '[MOON-PHASE-HANDLER] Failed to publish SSE notification');
            // Don't throw - moon phase was saved successfully
        }
        
        } catch (err) {
        logErrorFromCatch(err, '[MOON-PHASE-HANDLER] Error generating commentary');
        throw err;
    }
}

/**
 * Build moon phase prompt with user's astrological context and REAL astronomical data
 */
function buildMoonPhasePrompt(userInfo, astrologyInfo, phase, userGreeting, astronomicalContext) {
    const astro = astrologyInfo.astrology_data;
    
    let prompt = `Generate a rich, personalized insight for ${userGreeting} about the ${phase} moon phase:\n\n`;
    
    if (astro.sun_sign) {
        prompt += `COMPLETE BIRTH CHART:\n`;
        prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity, Will Power, Life Purpose\n`;
        prompt += `- Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Inner Emotional World, Inner Needs, Instinctive Reactions\n`;
        prompt += `- Rising Sign/Ascendant: ${astro.rising_sign} (${astro.rising_degree}°) - How they appear to others, Personal Magnetism, First Impression\n`;
        if (astro.venus_sign) prompt += `- Venus Sign: ${astro.venus_sign} (${astro.venus_degree}°) - Love, Attraction, Values\n`;
        if (astro.mars_sign) prompt += `- Mars Sign: ${astro.mars_sign} (${astro.mars_degree}°) - Action, Drive, Assertion\n`;
        if (astro.mercury_sign) prompt += `- Mercury Sign: ${astro.mercury_sign} (${astro.mercury_degree}°) - Communication, Thinking Style\n`;
        prompt += `- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}\n\n`;
    }
    
    // ADD CURRENT ASTRONOMICAL POSITIONS
    if (astronomicalContext.success) {
        prompt += `CURRENT ASTRONOMICAL POSITIONS (calculated, not fictional):\n`;
        prompt += `Moon Phase: ${astronomicalContext.currentMoonPhase}\n`;
        if (astronomicalContext.moonPosition) {
            prompt += `Current Moon Position: ${astronomicalContext.moonPosition.degree}° ${astronomicalContext.moonPosition.sign}\n`;
        }
        prompt += `\nCurrent Planetary Transits:\n`;
        prompt += formatPlanetsForPrompt(astronomicalContext.currentPlanets) + '\n\n';
    }
    
    prompt += `LUNAR CONTEXT:\n`;
    prompt += `Current Moon Phase: ${phase}\n\n`;
    prompt += `PERSONALIZATION REQUIREMENTS:\n`;
    prompt += `- Use the ACTUAL current Moon position (${astronomicalContext.moonPosition?.sign || 'unknown'}) in your interpretation\n`;
    prompt += `- Interpret how this moon phase directly activates their natal Moon sign (${astro.moon_sign})\n`;
    prompt += `- Show how the current Moon transit interacts with their Sun sign's core identity\n`;
    prompt += `- Describe what emotional and spiritual themes this phase heightens for them specifically\n`;
    prompt += `- Explain how their Rising sign experiences and reflects this lunar energy to the world\n`;
    prompt += `- Reference the REAL current planetary positions (not fictional ones) in context of this lunar phase\n`;
    prompt += `- Provide practical, personal guidance uniquely suited to their chart\n`;
    prompt += `- Suggest crystals that align with their birth chart and this specific phase\n`;
    prompt += `- Address them directly and make this deeply personal\n\n`;
    prompt += `DEPTH AND RICHNESS:\n`;
    prompt += `- Aim for 3-4 paragraphs minimum\n`;
    prompt += `- Be poetic but actionable\n`;
    prompt += `- Show deep knowledge of how lunar phases interact with individual birth charts\n`;
    prompt += `- Make specific, memorable connections to their unique astrology`;
    
    return prompt;
}

/**
 * Check if message is a moon phase request
 */
export function isMoonPhaseRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('moon phase');
}

/**
 * Extract phase name from message
 */
export function extractMoonPhase(message) {
    const match = message.match(/moon phase commentary for (\w+(?:\s+\w+)*)/i);
    if (match && match[1]) {
        return match[1];
    }
    return 'fullMoon';
}
