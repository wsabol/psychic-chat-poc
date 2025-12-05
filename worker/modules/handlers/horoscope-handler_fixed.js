import { db } from '../../shared/db.js';
import { calculateBirthChart } from '../astrology.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology, 
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage } from '../messages.js';

/**
 * Generate a personalized horoscope for the user
 * NOW: Works with just birth date OR full astrology data
 */
export async function generateHoroscope(userId, range = 'daily') {
    try {
        // Fetch user context
        const userInfo = await fetchUserPersonalInfo(userId);
        let astrologyInfo = await fetchUserAstrology(userId);
        
        if (!userInfo) {
            throw new Error('User personal info not found');
        }
        
        if (!userInfo.birth_date) {
            throw new Error('User birth date required for horoscope generation');
        }
        
        // If no astrology data, try to calculate it
        if (!astrologyInfo?.astrology_data) {
            
            // Only calculate if we have sufficient birth data
            if (userInfo.birth_time && userInfo.birth_country && userInfo.birth_province && userInfo.birth_city) {
                try {
                    const calculatedChart = await calculateBirthChart({
                        birth_date: userInfo.birth_date,
                        birth_time: userInfo.birth_time,
                        birth_country: userInfo.birth_country,
                        birth_province: userInfo.birth_province,
                        birth_city: userInfo.birth_city,
                        birth_timezone: userInfo.birth_timezone
                    });
                    
                    if (calculatedChart.success) {
                        const astrologyData = {
                            rising_sign: calculatedChart.rising_sign,
                            rising_degree: calculatedChart.rising_degree,
                            moon_sign: calculatedChart.moon_sign,
                            moon_degree: calculatedChart.moon_degree,
                            sun_sign: calculatedChart.sun_sign,
                            sun_degree: calculatedChart.sun_degree,
                            latitude: calculatedChart.latitude,
                            longitude: calculatedChart.longitude,
                            timezone: calculatedChart.timezone,
                            calculated_at: new Date().toISOString()
                        };
                        
                        // Store calculated astrology
                        await db.query(
                            `INSERT INTO user_astrology (user_id, zodiac_sign, astrology_data, created_at, updated_at)
                             VALUES ($1, $2, $3, NOW(), NOW())
                             ON CONFLICT (user_id) DO UPDATE SET
                             zodiac_sign = EXCLUDED.zodiac_sign,
                             astrology_data = EXCLUDED.astrology_data,
                             updated_at = NOW()`,
                            [userId, calculatedChart.sun_sign, JSON.stringify(astrologyData)]
                        );
                        
                                                astrologyInfo = {
                            zodiac_sign: calculatedChart.sun_sign,
                            astrology_data: astrologyData
                        };
                    }
                } catch (calcErr) {
                    console.warn('[HOROSCOPE-HANDLER] Birth chart calculation failed:', calcErr.message);
                    // Continue with basic horoscope using just birth date
                }
            }
        }
        
        // Build horoscope prompt (with astrology data if available, or just birth date)
        const horoscopePrompt = buildHoroscopePrompt(userInfo, astrologyInfo, range);
        
        // Get oracle base prompt
        const baseSystemPrompt = getOracleSystemPrompt();
        const userGreeting = getUserGreeting(userInfo, userId);
        
        const systemPrompt = baseSystemPrompt + `

SPECIAL REQUEST - HOROSCOPE GENERATION:
Generate a personalized ${range} horoscope for ${userGreeting} based on their birth information and current cosmic energy.
Focus on practical guidance blended with cosmic timing.
Keep it concise but meaningful (2-3 paragraphs).
Do NOT include tarot cards in this response - this is purely astrological guidance with crystal recommendations.
`;
        
        // Call Oracle with just the user's birth data (no chat history for horoscopes)
        const oracleResponse = await callOracle(systemPrompt, [], horoscopePrompt);
        
        // Store horoscope in database with metadata
        const horoscopeData = {
            text: oracleResponse,
            range: range,
            generated_at: new Date().toISOString(),
            zodiac_sign: astrologyInfo?.zodiac_sign || 'Unknown'
        };
        
        // Store as a system message for record-keeping
        await storeMessage(userId, 'horoscope', horoscopeData);
        return oracleResponse;
        
    } catch (err) {
        console.error('[HOROSCOPE-HANDLER] Error generating horoscope:', err.message);
        throw err;
    }
}

/**
 * Build horoscope prompt with user context
 * Works with full astrology data OR just birth date
 */
function buildHoroscopePrompt(userInfo, astrologyInfo, range) {
    let prompt = `Generate a personalized ${range} horoscope for ${userInfo.first_name || 'this person'}:\n\n`;
    
    if (astrologyInfo?.astrology_data) {
        const astro = astrologyInfo.astrology_data;
        
        if (astro.sun_sign) {
            // Calculated birth chart (full data)
            prompt += `Birth Chart Information:\n`;
            prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity\n`;
            prompt += `- Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Emotional Nature\n`;
            prompt += `- Rising Sign: ${astro.rising_sign} (${astro.rising_degree}°) - Outward Presentation\n`;
            if (userInfo.birth_city) {
                prompt += `- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}\n`;
            }
            prompt += `\n`;
        } else if (astro.name) {
            // Traditional zodiac data
            prompt += `Zodiac Sign: ${astro.name}\n`;
            if (astro.dates) prompt += `Dates: ${astro.dates}\n`;
            prompt += `\n`;
        }
    } else {
        // Just birth date available
        prompt += `Birth Date: ${userInfo.birth_date}\n`;
        if (userInfo.birth_city) {
            prompt += `Birth Location: ${userInfo.birth_city}${userInfo.birth_province ? ', ' + userInfo.birth_province : ''}, ${userInfo.birth_country}\n`;
        }
        prompt += `\n`;
    }
    
    prompt += `For the ${range}, consider:\n`;
    
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
        case 'monthly':
            prompt += `- What is the overarching energy for THIS MONTH?\n`;
            prompt += `- What major themes or opportunities are present?\n`;
            prompt += `- What areas of life need attention or growth?\n`;
            break;
    }
    
    prompt += `\nProvide practical, personalized guidance.`;
    
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
        if (['daily', 'weekly', 'monthly'].includes(range)) {
            return range;
        }
    }
    return 'daily'; // default
}
