import { db } from '../../shared/db.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology, 
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage } from '../messages.js';

/**
 * Generate daily and weekly horoscopes for the user at once
 * This way, switching between ranges doesn't require regeneration
 */
export async function generateHoroscope(userId, range = 'daily') {
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
        
        // Get oracle base prompt and user greeting
        const baseSystemPrompt = getOracleSystemPrompt();
        const userGreeting = getUserGreeting(userInfo, userId);
        const generatedAt = new Date().toISOString();
        
        // Generate daily and weekly horoscopes (monthly kept in DB but removed from UI for now)
        const ranges = ['daily', 'weekly'];
        
        for (const currentRange of ranges) {
            try {
                const horoscopePrompt = buildHoroscopePrompt(userInfo, astrologyInfo, currentRange, userGreeting);
                
                const systemPrompt = baseSystemPrompt + `

SPECIAL REQUEST - HOROSCOPE GENERATION:
Generate a personalized ${currentRange} horoscope addressing the user as "Dear ${userGreeting}" based on their birth chart and current cosmic energy.
Focus on practical guidance blended with cosmic timing.
Keep it concise but meaningful (2-3 paragraphs).
Do NOT include tarot cards in this response - this is purely astrological guidance with crystal recommendations.
`;
                
                // Call Oracle with just the user's birth data (no chat history for horoscopes)
                const oracleResponse = await callOracle(systemPrompt, [], horoscopePrompt);
                
                // Store horoscope in database with metadata
                const horoscopeData = {
                    text: oracleResponse,
                    range: currentRange,
                    generated_at: generatedAt,
                    zodiac_sign: astrologyInfo.zodiac_sign
                };
                
                // Store as a system message for record-keeping
                await storeMessage(userId, 'horoscope', horoscopeData);
                
            } catch (err) {
                console.error(`[HOROSCOPE-HANDLER] Error generating ${currentRange} horoscope:`, err.message);
                // Continue with next range even if one fails
            }
        }
        
    } catch (err) {
        console.error('[HOROSCOPE-HANDLER] Error generating horoscopes:', err.message);
        throw err;
    }
}

/**
 * Build horoscope prompt with user context
 */
function buildHoroscopePrompt(userInfo, astrologyInfo, range, userGreeting) {
    const astro = astrologyInfo.astrology_data;
    
    let prompt = `Generate a personalized ${range} horoscope for ${userGreeting}:\n\n`;
    
    if (astro.sun_sign) {
        // Calculated birth chart
        prompt += `Birth Chart:\n`;
        prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity\n`;
        prompt += `- Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Emotional Nature\n`;
        prompt += `- Rising Sign: ${astro.rising_sign} (${astro.rising_degree}°) - Outward Presentation\n`;
        prompt += `- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}\n`;
    } else if (astro.name) {
        // Traditional zodiac data
        prompt += `Sun Sign: ${astro.name}\n`;
    }
    
    prompt += `\nFor the ${range}, consider:\n`;
    
    switch (range.toLowerCase()) {
        case 'daily':
            prompt += `- What energies are prominent TODAY for this person?\n`;
            prompt += `- What actions or reflections would be most valuable right now?\n`;
            prompt += `- What crystals or practices would support them today?\n`;
            break;
        case 'weekly':
            prompt += `- What themes are emerging THIS WEEK?\n`;
            prompt += `- How do current planetary positions affect their trajectory?\n`;
            prompt += `- What should they focus on or prepare for?\n`;
            break;
    }
    
    prompt += `\nProvide practical, personalized guidance that honors their unique birth chart.`;
    
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
    return 'daily'; // default
}
