/**
 * Oracle Processor Utility
 * Handles oracle API calls, card extraction, translation, and message storage
 */

import { tarotDeck } from '../../tarotDeck.js';
import { extractCardsFromResponse, formatCardsForStorage } from '../cards.js';
import { buildPersonalInfoContext, buildAstrologyContext, getOracleSystemPrompt, callOracle } from '../oracle.js';
import { formatMessageContent, storeMessage, getMessageHistory } from '../messages.js';
import { translateContentObject } from '../translator.js';
import { notifyResponseReady } from '../../shared/notifications.js';

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
        const storedAt = new Date().toISOString();
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

        // Notify that response is ready so frontend can fetch it immediately
        try {
            await notifyResponseReady(userId, 'assistant', storedAt);
        } catch (notifyErr) {
            // Log but don't fail - notification is secondary
        }

        } catch (err) {
        throw new Error(`[ORACLE-PROCESSOR] Error processing oracle request: ${err.message}`);
    }
}

