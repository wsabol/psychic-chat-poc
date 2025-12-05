import { tarotDeck } from '../../tarotDeck.js';
import { extractCardsFromResponse, formatCardsForStorage } from '../cards.js';
import { 
    fetchUserPersonalInfo, 
    fetchUserAstrology,
    isTemporaryUser,
    buildPersonalInfoContext, 
    buildAstrologyContext,
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { getMessageHistory, storeMessage, formatMessageContent } from '../messages.js';
import { calculateBirthChart } from '../astrology.js';
import {
    detectViolation,
    recordViolationAndGetAction,
    isAccountSuspended,
    isAccountDisabled,
    getSelfHarmHotlineResponse
} from '../violationEnforcement.js';

/**
 * Handle regular chat messages from users
 */
export async function handleChatMessage(userId, message) {
    try {
        // Fetch user context
        const userInfo = await fetchUserPersonalInfo(userId);
        let astrologyInfo = await fetchUserAstrology(userId);
        
        // Check if user is temporary
        const tempUser = await isTemporaryUser(userId);
        
        // CHECK ACCOUNT STATUS: Disabled or Suspended
        if (!tempUser) {
            const disabled = await isAccountDisabled(userId);
            if (disabled) {
                console.log(`[VIOLATION] User ${userId} has disabled account - blocking message`);
                const response = `Your account has been permanently disabled due to repeated violations of our community guidelines. If you wish to appeal, please contact support.`;
                await storeMessage(userId, 'assistant', response);
                return;
            }
            
            const suspended = await isAccountSuspended(userId);
            if (suspended) {
                console.log(`[VIOLATION] User ${userId} has suspended account - blocking message`);
                const response = `Your account is currently suspended. Please try again after the suspension period ends.`;
                await storeMessage(userId, 'assistant', response);
                return;
            }
        }
        
        // CHECK FOR VIOLATIONS IN USER MESSAGE
        const violation = detectViolation(message);
        
        if (violation) {
            console.log(`[VIOLATION] Violation detected: ${violation.type} (keyword: ${violation.keyword})`);
            
            // Record violation and get enforcement action
            const enforcement = await recordViolationAndGetAction(userId, violation.type, message, tempUser);
            
            console.log(`[VIOLATION] Enforcement action: ${enforcement.action}`);
            
            // Get response (includes self-harm hotline if needed)
            let responseToUser = enforcement.response;
            if (violation.type === 'self_harm') {
                responseToUser = getSelfHarmHotlineResponse() + '\n\n' + enforcement.response;
            }
            
            // Store response
            await storeMessage(userId, 'assistant', responseToUser);
            
            // For temp accounts, we should signal that they're deleted
            if (enforcement.action === 'TEMP_ACCOUNT_DELETED') {
                console.log(`[VIOLATION] Temp account ${userId} has been deleted and should not process further messages`);
            }
            
            return;
        }
        
        // NO VIOLATIONS - Continue with normal chat processing
        
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
        
        // Get oracle prompt - MODIFIED to pass isTemporaryUser flag
        const systemPrompt = getOracleSystemPrompt(tempUser) + "\n\n" + combinedContext;
        
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
