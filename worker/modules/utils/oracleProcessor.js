/**
 * Oracle Processor Utility
 * Handles oracle API calls, card extraction, translation, and message storage
 */

import { tarotDeck } from '../../tarotDeck.js';
import { extractCardsFromResponse, formatCardsForStorage } from '../cards.js';
import { buildPersonalInfoContext, buildAstrologyContext, getOracleSystemPrompt, callOracle } from '../oracle.js';
import { formatMessageContent, storeMessage, getMessageHistory } from '../messages.js';
import { translateContentObject } from '../translator.js';

/**
 * Process oracle request: call API, extract cards, translate, and store
 * 
 * @param {string} userId - User ID
 * @param {object} userInfo - User personal info
 * @param {object} astrologyInfo - User astrology info
 * @param {object} userLanguage - User's language preference
 * @param {string} message - User message
 * @param {boolean} tempUser - Is temporary/trial account
 * @returns {Promise<void>}
 */
export async function processOracleRequest(userId, userInfo, astrologyInfo, userLanguage, oracleLanguage, message, tempUser) {
    try {
        // Get message history
        let history = await getMessageHistory(userId);

        // FILTER: Only include messages with valid OpenAI roles
        // Remove special roles like 'moon_phase', 'horoscope', 'cosmic_weather', etc.
        const validRoles = ['system', 'assistant', 'user', 'function', 'tool', 'developer'];
        history = history.filter(msg => validRoles.includes(msg.role));

        // Build context
        const personalContext = buildPersonalInfoContext(userInfo);
        const astrologyContext = buildAstrologyContext(astrologyInfo, userInfo);

        const combinedContext = personalContext + astrologyContext + `
IMPORTANT: Use the above personal and astrological information to:
- Address the user by their preferred name when appropriate
- Personalize your guidance based on their life circumstances and cosmic profile
- Reference their information naturally in conversation when relevant

`;

        // Get oracle prompt (accounts for temporary vs established users)
        // Use oracleLanguage for oracle responses, not userLanguage
        const systemPrompt = getOracleSystemPrompt(tempUser, oracleLanguage) + "\n\n" + combinedContext;

        // Call Oracle (generates both full and brief responses)
        const oracleResponses = await callOracle(systemPrompt, history, message, true);
        
        // DEBUG: Check Oracle response
        
        // Check if Oracle refused to provide medical/health advice
        if (detectOracleHealthRefusal(oracleResponses.full)) {
            await logHealthViolation(userId, message);
        }
        
        // Check if Oracle refused to encourage self-harm
        if (detectOracleSelfHarmRefusal(oracleResponses.full)) {
            await logSelfHarmViolation(userId, message);
        }

        // Extract cards from FULL response only
        const cards = extractCardsFromResponse(oracleResponses.full, tarotDeck);
        const formattedCards = formatCardsForStorage(cards);

        // Format both full and brief in English
        const fullContent = formatMessageContent(oracleResponses.full, formattedCards);
        const briefContent = formatMessageContent(oracleResponses.brief, formattedCards);

        // Translate if user prefers non-English language
        let fullContentLang = null;
        let briefContentLang = null;

        if (userLanguage && userLanguage !== 'en-US') {
            fullContentLang = await translateContentObject(fullContent, userLanguage);
            briefContentLang = await translateContentObject(briefContent, userLanguage);
        }

        // Store message with both English and translated versions (if applicable)
        try {
            await storeMessage(
                userId,
                'assistant',
                fullContent,
                briefContent,
                userLanguage !== 'en-US' ? userLanguage : null,
                fullContentLang,
                briefContentLang
            );
        } catch (storageErr) {
            throw new Error(`Failed to store oracle message: ${storageErr.message}`);
        }

        } catch (err) {
            throw new Error(`[ORACLE-PROCESSOR] Error processing oracle request: ${err.message}`);
        }
}

/**
 * Detect if Oracle refused to provide medical/health advice
 * Checks for common refusal phrases in Oracle's response
 */
function detectOracleHealthRefusal(oracleResponse) {
    const refusalPhrases = [
        "can't provide medical",
        "cannot provide medical",
        "can't offer medical",
        "cannot offer medical",
        "consult a healthcare",
        "consult a doctor",
        "seek medical",
        "see a doctor",
        "medical professional",
        "healthcare professional",
        "not a medical",
        "not qualified to provide medical",
        "beyond my abilities",
        "i'm not able to provide medical"
    ];
    
    const lowerResponse = oracleResponse.toLowerCase();
    return refusalPhrases.some(phrase => lowerResponse.includes(phrase));
}

/**
 * Detect if Oracle provided suicide/crisis resources
 * This means user mentioned suicide/self-harm but we should LOG not BAN (unless clear personal intent)
 */
function detectOracleSelfHarmRefusal(oracleResponse) {
    const lowerResponse = oracleResponse.toLowerCase();
    
    // Suicide hotline indicators - Oracle provides these for suicide concerns
    const suicideHotlineIndicators = [
        "988",  // Suicide hotline number
        "national suicide prevention",
        "crisis helpline",
        "suicide prevention lifeline"
    ];
    
    // Crisis support indicators - Oracle uses these when concerned about user safety
    const crisisIndicators = [
        "in crisis",
        "feeling overwhelmed",
        "talk to someone who can help",
        "trusted adult, counselor",
        "mental health professional",
        "seek support from those who care",
        "you are not alone",
        "if you are feeling",
        "reach out for support"
    ];
    
    // Self-harm/coping phrases - Oracle discouraging self-harm
    const selfHarmContext = [
        "healthy ways to cope",
        "healthier coping",
        "without resorting",
        "professional who can help"
    ];
    
    // Check for any indicators
    const hasHotline = suicideHotlineIndicators.some(phrase => lowerResponse.includes(phrase));
    const hasCrisisSupport = crisisIndicators.some(phrase => lowerResponse.includes(phrase));
    const hasCopingAdvice = selfHarmContext.some(phrase => lowerResponse.includes(phrase));
    
    return hasHotline || hasCrisisSupport || hasCopingAdvice;
}

/**
 * Log health violation to database for compliance tracking
 */
async function logHealthViolation(userId, userMessage) {
        const { db } = await import('../../shared/db.js');
        const { hashUserId } = await import('../../shared/hashUtils.js');
        
        const userIdHash = hashUserId(userId);
        
        await db.query(
            `INSERT INTO user_violations (user_id_hash, violation_type, violation_count, violation_message, severity, is_active)
            VALUES ($1, $2, 1, $3, 'info', true)`,
            [userIdHash, 'health_medical_advice', userMessage.substring(0, 500)]
        );
}

/**
 * Log self-harm concern to database - TRACKING ONLY
 * Oracle AI detected suicide/self-harm mention and provided crisis resources
 * This is logged for monitoring but does NOT result in account ban
 * (Only keyword detector bans for clear personal intent like "I want to kill myself")
 */
async function logSelfHarmViolation(userId, userMessage) {
        const { db } = await import('../../shared/db.js');
        const { hashUserId } = await import('../../shared/hashUtils.js');
        
        const userIdHash = hashUserId(userId);
        
        // Log as WARNING (not critical) - no account action
        // Oracle provides hotline and support resources in response
        await db.query(
            `INSERT INTO user_violations (user_id_hash, violation_type, violation_count, violation_message, severity, is_active)
            VALUES ($1, $2, 1, $3, 'warning', true)`,
            [userIdHash, 'self_harm_concern', userMessage.substring(0, 500)]
        );
}

