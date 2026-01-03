import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology,
    fetchUserLanguagePreference,
    isTemporaryUser,
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage, formatMessageContent } from '../messages.js';
import { translateContentObjectLocally } from '../localTranslator.js';

/**
 * Generate daily and weekly horoscopes for the user at once
 * This way, switching between ranges doesn't require regeneration
 * Translates to user's preferred language if not English US
 */
export async function generateHoroscope(userId, range = 'daily') {
    try {
        console.log(`[HOROSCOPE-HANDLER] Starting horoscope generation - userId: ${userId}, range: ${range}`);
        // Check if horoscope already generated today
        const today = new Date().toISOString().split('T')[0];
        const userIdHash = hashUserId(userId);
        
        const { rows: existingHoroscopes } = await db.query(
            `SELECT id FROM messages WHERE user_id_hash = $1 AND role = 'horoscope' AND created_at::date = $2::date LIMIT 1`,
            [userIdHash, today]
        );
        
        if (existingHoroscopes.length > 0) {
            console.log('[HOROSCOPE-HANDLER] Horoscope already generated today, skipping');
            return;
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
        
        // Check if user is temporary/trial account
        const isTemporary = await isTemporaryUser(userId);
        
        // Get oracle base prompt and user greeting
        const baseSystemPrompt = getOracleSystemPrompt(isTemporary);
        const userGreeting = getUserGreeting(userInfo, userId, isTemporary);
        const generatedAt = new Date().toISOString();
        
        // Generate only the requested range - no double generation
        // Weekly horoscopes are more complex and take longer, but we don't compound by generating both
        const ranges = [range];
        
        for (const currentRange of ranges) {
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
`;
                
                // Call Oracle with just the user's birth data (no chat history for horoscopes)
                // Always generate in English first
                const oracleResponses = await callOracle(systemPrompt, [], horoscopePrompt, true);
                
                // Store horoscope in database with metadata (in English)
                const horoscopeDataFull = {
                    text: oracleResponses.full,
                    range: currentRange,
                    generated_at: generatedAt,
                    zodiac_sign: astrologyInfo.zodiac_sign
                };
                
                const horoscopeDataBrief = { 
                    text: oracleResponses.brief, 
                    range: currentRange, 
                    generated_at: generatedAt, 
                    zodiac_sign: astrologyInfo.zodiac_sign 
                };
                
                // Translate to user's preferred language using LOCAL translator (no OpenAI API calls)
                // Fast, consistent translations stored in database
                let horoscopeDataFullLang = null;
                let horoscopeDataBriefLang = null;
                
                if (userLanguage && userLanguage !== 'en-US') {
                    console.log(`[HOROSCOPE-HANDLER] Translating ${currentRange} horoscope to ${userLanguage}...`);
                    horoscopeDataFullLang = await translateContentObjectLocally(horoscopeDataFull, userLanguage);
                    horoscopeDataBriefLang = await translateContentObjectLocally(horoscopeDataBrief, userLanguage);
                    console.log(`[HOROSCOPE-HANDLER] ✓ Translation complete`);
                }
                
                // Store message with both English and translated versions (if applicable)
                // Always pass userLanguage (even if en-US) so it's tracked
                await storeMessage(
                    userId, 
                    'horoscope', 
                    horoscopeDataFull, 
                    horoscopeDataBrief,
                    userLanguage,
                    userLanguage !== 'en-US' ? horoscopeDataFullLang : null,
                    userLanguage !== 'en-US' ? horoscopeDataBriefLang : null
                );
                
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
        // Calculated birth chart with complete details
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
        // Traditional zodiac data
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
