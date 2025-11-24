import { tarotDeck } from '../../tarotDeck.js';
import { extractCardsFromResponse, formatCardsForStorage } from '../cards.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology, 
    buildPersonalInfoContext, 
    buildAstrologyContext,
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { getMessageHistory, storeMessage, formatMessageContent } from '../messages.js';
import { calculateBirthChart } from '../astrology.js';

/**
 * Handle regular chat messages from users
 */
export async function handleChatMessage(userId, message) {
    try {
        // Fetch user context
        const userInfo = await fetchUserPersonalInfo(userId);
        let astrologyInfo = await fetchUserAstrology(userId);
        
        // Calculate astrology if not present and we have birth data
        if (!astrologyInfo && userInfo?.birth_date && userInfo?.birth_time && userInfo?.birth_country && userInfo?.birth_province && userInfo?.birth_city) {
            try {
                const calculatedChart = await calculateBirthChart({
                    birth_date: userInfo.birth_date,
                    birth_time: userInfo.birth_time,
                    birth_country: userInfo.birth_country,
                    birth_province: userInfo.birth_province,
                    birth_city: userInfo.birth_city,
                    birth_timezone: userInfo.birth_timezone
                });
                
                if (calculatedChart.success && calculatedChart.rising_sign && calculatedChart.moon_sign) {
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
                    
                    await storeAstrologyData(userId, calculatedChart.sun_sign, astrologyData);
                    astrologyInfo = {
                        zodiac_sign: calculatedChart.sun_sign,
                        astrology_data: astrologyData
                    };
                }
            } catch (err) {
                console.warn('[CHAT-HANDLER] Astrology calculation failed:', err.message);
            }
        }
        
        // Get message history
        const history = await getMessageHistory(userId);
        
        // Build context
        const personalContext = buildPersonalInfoContext(userInfo);
        const astrologyContext = buildAstrologyContext(astrologyInfo, userInfo);
        const userGreeting = getUserGreeting(userInfo, userId);
        
        const combinedContext = personalContext + astrologyContext + `
IMPORTANT: Use the above personal and astrological information to:
- Address the user by their preferred name: "${userGreeting}"
- Personalize your guidance based on their life circumstances and cosmic profile
- Reference their information naturally in conversation when relevant

`;
        
        // Get oracle prompt
        const systemPrompt = getOracleSystemPrompt() + "\n\n" + combinedContext;
        
        // Call Oracle
        const oracleResponse = await callOracle(systemPrompt, history, message);
        
        // Extract cards from response
        const cards = extractCardsFromResponse(oracleResponse, tarotDeck);
        const formattedCards = formatCardsForStorage(cards);
        
        // Format and store response
        const messageContent = formatMessageContent(oracleResponse, formattedCards);
        await storeMessage(userId, 'assistant', messageContent);
        
    } catch (err) {
        console.error('[CHAT-HANDLER] Error handling chat message:', err.message);
        throw err;
    }
}

/**
 * Store astrology data in database
 */
async function storeAstrologyData(userId, sunSign, astrologyData) {
    try {
        const { db } = await import('../../shared/db.js');
        await db.query(
            `INSERT INTO user_astrology (user_id, zodiac_sign, astrology_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
             astrology_data = EXCLUDED.astrology_data,
             updated_at = CURRENT_TIMESTAMP`,
            [userId, sunSign, JSON.stringify(astrologyData)]
        );
    } catch (err) {
        console.error('[CHAT-HANDLER] Error storing astrology:', err.message);
        throw err;
    }
}
