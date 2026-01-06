import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology,
    fetchUserLanguagePreference,
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage } from '../messages.js';
import { translateContentObject } from '../translator.js';
import { getUserTimezone, getLocalDateForTimezone, needsRegeneration } from '../utils/timezoneHelper.js';

/**
 * Generate personalized moon phase commentary based on user's birth chart
 * Translates to user's preferred language using MyMemory (no OpenAI calls for translation)
 */
export async function generateMoonPhaseCommentary(userId, phase) {
    try {
        console.log(`[MOON-PHASE-HANDLER] Starting moon phase generation - userId: ${userId}, phase: ${phase}`);
        // Get user timezone and today's local date
        const userTimezone = await getUserTimezone(userIdHash);
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        console.log(`[MOON-PHASE-HANDLER] User timezone: ${userTimezone}, Today (local): ${todayLocalDate}`);
        const userIdHash = hashUserId(userId);
        
        // Check if THIS SPECIFIC PHASE was already generated for today (in user's timezone)
        const { rows: existingMoonPhase } = await db.query(
                        `SELECT id, created_at_local_date FROM messages WHERE user_id_hash = $1 AND role = 'moon_phase' AND moon_phase = $2 ORDER BY created_at DESC LIMIT 1`,
            [userIdHash, phase]
        );
        
        if (existingMoonPhase.length > 0) {
            const createdAtLocalDate = existingMoonPhase[0].created_at_local_date;
            if (!needsRegeneration(createdAtLocalDate, todayLocalDate)) {
                console.log(`[MOON-PHASE-HANDLER] ${phase} moon phase already generated for today (${todayLocalDate}), skipping`);
                return;
            }
        } else {
                console.log(`[MOON-PHASE-HANDLER] No existing ${phase} moon phase found, proceeding with generation`);
        }
        
        // Fetch user context
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        
        if (!userInfo) {
            throw new Error('User personal info not found');
        }
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('User astrology data not found');
        }
        
        // Build moon phase prompt
        const moonPhasePrompt = buildMoonPhasePrompt(userInfo, astrologyInfo, phase);
        
        // Get oracle base prompt
        const baseSystemPrompt = getOracleSystemPrompt();
        const userGreeting = getUserGreeting(userInfo, userId);
        
        const systemPrompt = baseSystemPrompt + `

SPECIAL REQUEST - MOON PHASE INSIGHT:
Generate a rich, personalized insight about how the current ${phase} moon phase affects ${userGreeting} based on their complete birth chart.
Do NOT keep it brief - provide meaningful depth (3-4 paragraphs minimum).
Incorporate specific references to their Sun sign (core identity), Moon sign (emotional nature), and Rising sign (how they present to the world).
Address them directly and personally.
Focus on how this specific phase influences them emotionally, spiritually, and practically.
Include crystal recommendations aligned with their chart and this lunar phase.
Do NOT include tarot cards - this is purely lunar + astrological insight enriched by their unique birth chart.
`;
        
        // Call Oracle (always in English first)
        console.log(`[MOON-PHASE-HANDLER] Calling OpenAI for ${phase} moon phase...`);
        const oracleResponses = await callOracle(systemPrompt, [], moonPhasePrompt, true);
        console.log(`[MOON-PHASE-HANDLER] ✓ OpenAI response received`);
        
        // Store moon phase commentary - BOTH full and brief (in English)
        const moonPhaseData = {
            text: oracleResponses.full,
            phase: phase,
            generated_at: new Date().toISOString(),
            zodiac_sign: astrologyInfo.zodiac_sign
        };
        
        const moonPhaseDataBrief = { 
            text: oracleResponses.brief, 
            phase: phase, 
            generated_at: new Date().toISOString(), 
            zodiac_sign: astrologyInfo.zodiac_sign 
        };
        
        // Translate if user prefers non-English language (using MyMemory, not OpenAI)
        let moonPhaseDataLang = null;
        let moonPhaseDataBriefLang = null;
        
        if (userLanguage && userLanguage !== 'en-US') {
            console.log(`[MOON-PHASE-HANDLER] Translating ${phase} moon phase to ${userLanguage}...`);
            moonPhaseDataLang = await translateContentObject(moonPhaseData, userLanguage);
            moonPhaseDataBriefLang = await translateContentObject(moonPhaseDataBrief, userLanguage);
            console.log(`[MOON-PHASE-HANDLER] ✓ Translation complete`);
        }
        
        // Store message with both English and translated versions (if applicable)
        // CRITICAL: Pass all parameters in CORRECT ORDER
        console.log(`[MOON-PHASE-HANDLER] Storing ${phase} moon phase to database...`);
        await storeMessage(
            userId,                                                    // 1: userId
            'moon_phase',                                              // 2: role
            moonPhaseData,                                             // 3: contentFull (English)
            moonPhaseDataBrief,                                        // 4: contentBrief (English)
            userLanguage,                                              // 5: languageCode
            userLanguage !== 'en-US' ? moonPhaseDataLang : null,       // 6: contentFullLang
            userLanguage !== 'en-US' ? moonPhaseDataBriefLang : null,  // 7: contentBriefLang
            null,                                                      // 8: horoscopeRange (not used for moon)
            phase,                                                     // 9: moonPhase ← CRITICAL!
            null,                                                      // 10: contentType
            todayLocalDate                                             // 11: created_at_local_date
        );
        console.log(`[MOON-PHASE-HANDLER] ✓ ${phase} moon phase generated and stored`);
        
    } catch (err) {
        console.error('[MOON-PHASE-HANDLER] Error generating commentary:', err.message);
        console.error('[MOON-PHASE-HANDLER] Stack:', err.stack);
        throw err;
    }
}

/**
 * Build moon phase prompt with user's astrological context
 */
function buildMoonPhasePrompt(userInfo, astrologyInfo, phase) {
    const astro = astrologyInfo.astrology_data;
    
    let prompt = `Generate a rich, personalized insight for ${userInfo.first_name || 'this person'} about the ${phase} moon phase:\n\n`;
    
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
    
    prompt += `LUNAR CONTEXT:\n`;
    prompt += `Current Moon Phase: ${phase}\n\n`;
    prompt += `PERSONALIZATION REQUIREMENTS:\n`;
    prompt += `- Interpret how this moon phase directly activates their natal Moon sign\n`;
    prompt += `- Show how it amplifies or challenges their Sun sign's core identity\n`;
    prompt += `- Describe what emotional and spiritual themes this phase heightens for them specifically\n`;
    prompt += `- Explain how their Rising sign experiences and reflects this lunar energy to the world\n`;
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
    return 'fullMoon'; // default
}
