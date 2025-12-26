import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
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
                const response = `Your account has been permanently disabled due to repeated violations of our community guidelines. If you wish to appeal, please contact support.`;
                await storeMessage(userId, 'assistant', response);
                return;
            }
            
            const suspended = await isAccountSuspended(userId);
                        if (suspended) {
                const response = `Your account is currently suspended. Please try again after the suspension period ends.`;
                await storeMessage(userId, 'assistant', response);
                return;
            }
        }
        
        // CHECK FOR VIOLATIONS IN USER MESSAGE
        const violation = detectViolation(message);
        
                if (violation) {
            // Record violation and get enforcement action
            const enforcement = await recordViolationAndGetAction(userId, violation.type, message, tempUser);
            
            // Get response (includes self-harm hotline if needed)
            let responseToUser = enforcement.response;
            if (violation.type === 'self_harm') {
                responseToUser = getSelfHarmHotlineResponse() + '\n\n' + enforcement.response;
            }
            
            // Store response
            await storeMessage(userId, 'assistant', responseToUser);
            
                        // For temp accounts, account has been deleted
            
            return;
        }
        
                // NO VIOLATIONS - Continue with normal chat processing
        
        // CHECK FOR HOROSCOPE REQUEST IN CHAT
        if (isHoroscopeRequestInChat(message)) {
            await handleHoroscopeInChat(userId, userInfo, astrologyInfo);
            return;
        }
        
                // CHECK FOR MOON PHASE REQUEST IN CHAT
        if (isMoonPhaseRequestInChat(message)) {
            const phase = extractMoonPhaseFromChat(message);
            await handleMoonPhaseInChat(userId, userInfo, astrologyInfo, phase);
            return;
        }
        
        // CHECK FOR COSMIC WEATHER REQUEST IN CHAT
        if (isCosmicWeatherRequestInChat(message)) {
            await handleCosmicWeatherInChat(userId, userInfo);
            return;
        }
        
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
        let history = await getMessageHistory(userId);
        
        // FILTER: Only include messages with valid OpenAI roles
        // Filter out special roles like 'moon_phase', 'horoscope', 'cosmic_weather', etc.
        const validRoles = ['system', 'assistant', 'user', 'function', 'tool', 'developer'];

        history = history.filter(msg => validRoles.includes(msg.role));

        
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
        const oracleResponses = await callOracle(systemPrompt, history, message, true);
        
        // Extract cards from FULL response only
        const cards = extractCardsFromResponse(oracleResponses.full, tarotDeck);
        const formattedCards = formatCardsForStorage(cards);
        
        // Format both full and brief
        const fullContent = formatMessageContent(oracleResponses.full, formattedCards);
        const briefContent = formatMessageContent(oracleResponses.brief, formattedCards);
        await storeMessage(userId, 'assistant', fullContent, briefContent);
        
    } catch (err) {
        console.error('[CHAT-HANDLER] Error handling chat message:', err.message);
        throw err;
    }
}

/**
 * Detect if user is asking for horoscope in chat
 */
function isHoroscopeRequestInChat(message) {
    const horoscopeKeywords = ['horoscope', 'daily reading', 'weekly reading', 'cosmic guidance for me', "what's my horoscope"];
    return horoscopeKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

/**
 * Detect if user is asking for moon phase in chat
 */
function isMoonPhaseRequestInChat(message) {
    const moonKeywords = ['moon phase', 'lunar phase', 'what\'s the moon phase', 'current moon', 'lunar energy'];
    return moonKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

/**
 * Detect if user is asking for cosmic weather in chat
 */
function isCosmicWeatherRequestInChat(message) {
    const cosmicKeywords = ['cosmic weather', 'today\'s cosmic', 'planetary energy', 'planet positions'];
    return cosmicKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

/**
 * Extract moon phase from chat message (or use current)
 */
function extractMoonPhaseFromChat(message) {
    const phases = ['newMoon', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'fullMoon', 'waningGibbous', 'lastQuarter', 'waningCrescent'];
    for (const phase of phases) {
        if (message.toLowerCase().includes(phase.toLowerCase())) {
            return phase;
        }
    }
    return null; // Will be determined by Python calculation
}

/**
 * Handle horoscope request in chat - fetch existing or trigger generation
 */
async function handleHoroscopeInChat(userId, userInfo, astrologyInfo) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const defaultRange = 'daily';
        const userIdHash = hashUserId(userId);
        
        // Check if horoscope exists for today
        const { rows } = await db.query(
            `SELECT pgp_sym_decrypt(content_full_encrypted, $2)::text as content FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'horoscope'
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userIdHash, process.env.ENCRYPTION_KEY]
        );
        
        // Find valid horoscope from today
        let validHoroscope = null;
        for (const row of rows) {
            const horoscope = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
            const generatedDate = horoscope.generated_at?.split('T')[0];
            if (generatedDate === today && horoscope.range === defaultRange) {
                validHoroscope = horoscope;
                break;
            }
        }
        
                if (validHoroscope) {
            // Horoscope exists - present it in chat
            const userGreeting = getUserGreeting(userInfo, userId);
            const response = `✨ Your personalized horoscope is available in the Horoscope page. Would you like me to help with something else?`;
            await storeMessage(userId, 'assistant', response);
        } else {
            // Horoscope doesn't exist - trigger generation and notify user
            const userGreeting = getUserGreeting(userInfo, userId);
            const response = `✨ I'm preparing your horoscope. Please visit the Horoscope page to see it when it's ready.`;
            await storeMessage(userId, 'assistant', response);
            
                                    // Trigger horoscope generation directly
            const { generateHoroscope } = await import('./horoscope-handler.js');
                        generateHoroscope(userId, defaultRange).catch(err => 
                console.error('[CHAT-HANDLER] Error triggering horoscope:', err.message)
            );
        }
    } catch (err) {
        console.error('[CHAT-HANDLER] Error handling horoscope in chat:', err.message);
        const response = `I encountered an error retrieving your horoscope. Please try again in a moment.`;
        await storeMessage(userId, 'assistant', response);
    }
}

/**
 * Handle moon phase request in chat - fetch existing or trigger generation
 */
async function handleMoonPhaseInChat(userId, userInfo, astrologyInfo, phase) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const userGreeting = getUserGreeting(userInfo, userId);
        const userIdHash = hashUserId(userId);
        
                // If no specific phase mentioned, calculate current
        let currentPhase = phase;
        if (!currentPhase) {
            try {
                const { getCurrentMoonPhase } = await import('../astrology.js');
                const moonData = await getCurrentMoonPhase();
                currentPhase = moonData.phase || 'fullMoon';
            } catch (calcErr) {
                console.warn('[CHAT-HANDLER] Failed to calculate moon phase, using default:', calcErr.message);
                currentPhase = 'fullMoon'; // fallback
            }
        }
        
        // Check if moon phase commentary exists for today
        const { rows } = await db.query(
            `SELECT pgp_sym_decrypt(content_full_encrypted, $2)::text as content FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'moon_phase'
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userIdHash, process.env.ENCRYPTION_KEY]
        );
        
        // Find valid commentary from today
        let validCommentary = null;
        for (const row of rows) {
            const commentary = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
            const generatedDate = commentary.generated_at?.split('T')[0];
            if (generatedDate === today && commentary.phase === currentPhase) {
                validCommentary = commentary;
                break;
            }
        }
        
                if (validCommentary) {
            // Commentary exists - acknowledge but don't display the oracle response here
            // User should visit the Moon Phase page to see the commentary
            const response = `🌙 Your personalized moon phase insight is available in the Moon Phase page. Would you like me to help with something else?`;
            await storeMessage(userId, 'assistant', response);
                } else {
            // Commentary doesn't exist - trigger generation without showing oracle response
            const response = `🌙 I'm preparing your lunar insight. Please visit the Moon Phase page to see it when it's ready.`;
            await storeMessage(userId, 'assistant', response);
            
                                    // Trigger moon phase generation directly
            const { generateMoonPhaseCommentary } = await import('./moon-phase-handler.js');
                        generateMoonPhaseCommentary(userId, currentPhase).catch(err => 
                console.error('[CHAT-HANDLER] Error triggering moon phase:', err.message)
            );
        }
    } catch (err) {
        console.error('[CHAT-HANDLER] Error handling moon phase in chat:', err.message);
        const response = `I encountered an error retrieving the lunar insight. Please try again in a moment.`;
        await storeMessage(userId, 'assistant', response);
    }
}

/**
 * Store astrology data in database
 */
/**
 * Handle cosmic weather request in chat
 */
async function handleCosmicWeatherInChat(userId, userInfo) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const userGreeting = getUserGreeting(userInfo, userId);
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query(
            `SELECT pgp_sym_decrypt(content_full_encrypted, $2)::text as content FROM messages WHERE user_id_hash = $1 AND role = 'cosmic_weather' ORDER BY created_at DESC LIMIT 5`,
            [userIdHash, process.env.ENCRYPTION_KEY]
        );
        let validWeather = null;
        for (const row of rows) {
            const weather = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
            const generatedDate = weather.generated_at?.split('T')[0] || weather.date?.split('T')[0];
            if (generatedDate === today) {
                validWeather = weather;
                break;
            }
        }
                if (validWeather) {
            const response = `✨ Today's cosmic weather is available in the Cosmic Weather page. Would you like me to help with something else?`;
            await storeMessage(userId, 'assistant', response);
        } else {
            const response = `✨ I'm reading today's planetary energies. Please visit the Cosmic Weather page to see them when ready.`;
            await storeMessage(userId, 'assistant', response);
            const { generateCosmicWeather } = await import('./cosmic-weather-handler.js');
                        generateCosmicWeather(userId).catch(err => console.error('[CHAT-HANDLER] Error triggering cosmic weather:', err.message));
        }
    } catch (err) {
        console.error('[CHAT-HANDLER] Error handling cosmic weather in chat:', err.message);
        const response = `I encountered an error reading the cosmic energy. Please try again in a moment.`;
        await storeMessage(userId, 'assistant', response);
    }
}

/**
 * Store astrology data in database
 */
async function storeAstrologyData(userId, sunSign, astrologyData) {
    try {
        const userIdHash = hashUserId(userId);
        await db.query(
            `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id_hash) DO UPDATE SET
             astrology_data = EXCLUDED.astrology_data,
             updated_at = CURRENT_TIMESTAMP`,
            [userIdHash, sunSign, JSON.stringify(astrologyData)]
        );
    } catch (err) {
        console.error('[CHAT-HANDLER] Error storing astrology:', err.message);
        throw err;
    }
}
