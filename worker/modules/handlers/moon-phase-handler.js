import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology, 
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage } from '../messages.js';

/**
 * Generate personalized moon phase commentary based on user's birth chart
 */
export async function generateMoonPhaseCommentary(userId, phase) {
    try {
        // Fetch user context
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        
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
Generate a brief, personalized insight about how the current ${phase} moon phase affects ${userGreeting} based on their birth chart.
Consider their Sun sign (core identity), Moon sign (emotional nature), and Rising sign (how they present to the world).
Keep it concise (2-3 sentences) and practical.
Focus on how this specific phase influences them emotionally and spiritually.
Do NOT include tarot cards - this is purely lunar + astrological insight.
`;
        
        // Call Oracle
        const oracleResponse = await callOracle(systemPrompt, [], moonPhasePrompt);
        
        // Store moon phase commentary
        const moonPhaseData = {
            text: oracleResponse,
            phase: phase,
            generated_at: new Date().toISOString(),
            zodiac_sign: astrologyInfo.zodiac_sign
        };
        
        // Store as a system message
        await storeMessage(userId, 'moon_phase', moonPhaseData);
        
    } catch (err) {
        console.error('[MOON-PHASE-HANDLER] Error generating commentary:', err.message);
        throw err;
    }
}

/**
 * Build moon phase prompt with user's astrological context
 */
function buildMoonPhasePrompt(userInfo, astrologyInfo, phase) {
    const astro = astrologyInfo.astrology_data;
    
    let prompt = `Generate personalized insight for ${userInfo.first_name || 'this person'} about the ${phase} moon phase:\n\n`;
    
    if (astro.sun_sign) {
        prompt += `Birth Chart:\n`;
        prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity & Will\n`;
        prompt += `- Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Inner Emotional World\n`;
        prompt += `- Rising Sign: ${astro.rising_sign} (${astro.rising_degree}°) - Outward Personality\n\n`;
    }
    
    prompt += `Current Lunar Phase: ${phase}\n\n`;
    prompt += `Consider:\n`;
    prompt += `- How does this moon phase interact with their Moon sign (emotional response)?\n`;
    prompt += `- How does it influence their Sun sign (core drive and identity)?\n`;
    prompt += `- What does their Rising sign need during this phase?\n`;
    prompt += `- Practical guidance for working with this lunar energy\n\n`;
    prompt += `Keep the insight personal, brief, and actionable.`;
    
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
