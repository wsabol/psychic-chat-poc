/**
 * Special Request Detector Utility
 * Detects and handles horoscope, moon phase, and cosmic weather requests
 */

import { db } from '../../../../shared/db.js';
import { hashUserId } from '../../../../shared/hashUtils.js';
import { storeMessage } from '../messages.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

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
 * Handle horoscope request in chat
 */
async function handleHoroscopeInChat(userId, userInfo) {
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
            const response = `✨ Your personalized horoscope is available in the Horoscope page. Would you like me to help with something else?`;
            await storeMessage(userId, 'assistant', { text: response });
        } else {
            // Horoscope doesn't exist - trigger generation and notify user
            const response = `✨ I'm preparing your horoscope. Please visit the Horoscope page to see it when it's ready.`;
            await storeMessage(userId, 'assistant', { text: response });

                        // Trigger horoscope generation directly (don't await)
            const { generateHoroscope } = await import('../handlers/horoscope-handler.js');
            generateHoroscope(userId, defaultRange).catch(err =>
                logErrorFromCatch(err, '[SPECIAL-REQUEST] Error triggering horoscope')
            );
        }
        } catch (err) {
        logErrorFromCatch(err, '[SPECIAL-REQUEST] Error handling horoscope in chat');
        const response = `I encountered an error retrieving your horoscope. Please try again in a moment.`;
        await storeMessage(userId, 'assistant', { text: response });
    }
}

/**
 * Handle moon phase request in chat
 */
async function handleMoonPhaseInChat(userId, userInfo, phase) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const userIdHash = hashUserId(userId);

        // If no specific phase mentioned, calculate current
        let currentPhase = phase;
        if (!currentPhase) {
            try {
                const { getCurrentMoonPhase } = await import('../astrology.js');
                const moonData = await getCurrentMoonPhase();
                currentPhase = moonData.phase || 'fullMoon';
            } catch (calcErr) {
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
            const response = `🌙 Your personalized moon phase insight is available in the Moon Phase page. Would you like me to help with something else?`;
            await storeMessage(userId, 'assistant', { text: response });
        } else {
            // Commentary doesn't exist - trigger generation without showing oracle response
            const response = `🌙 I'm preparing your lunar insight. Please visit the Moon Phase page to see it when it's ready.`;
            await storeMessage(userId, 'assistant', { text: response });

                        // Trigger moon phase generation directly (don't await)
            const { generateMoonPhaseCommentary } = await import('../handlers/moon-phase-handler.js');
            generateMoonPhaseCommentary(userId, currentPhase).catch(err =>
                logErrorFromCatch(err, '[SPECIAL-REQUEST] Error triggering moon phase')
            );
        }
        } catch (err) {
        logErrorFromCatch(err, '[SPECIAL-REQUEST] Error handling moon phase in chat');
        const response = `I encountered an error retrieving the lunar insight. Please try again in a moment.`;
        await storeMessage(userId, 'assistant', { text: response });
    }
}

/**
 * Handle cosmic weather request in chat
 */
async function handleCosmicWeatherInChat(userId) {
    try {
        const today = new Date().toISOString().split('T')[0];
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
            await storeMessage(userId, 'assistant', { text: response });
        } else {
            const response = `✨ I'm reading today's planetary energies. Please visit the Cosmic Weather page to see them when ready.`;
            await storeMessage(userId, 'assistant', { text: response });

                        // Trigger cosmic weather generation directly (don't await)
            const { generateCosmicWeather } = await import('../handlers/cosmic-weather-handler.js');
            generateCosmicWeather(userId).catch(err => 
                logErrorFromCatch(err, '[SPECIAL-REQUEST] Error triggering cosmic weather')
            );
        }
        } catch (err) {
        logErrorFromCatch(err, '[SPECIAL-REQUEST] Error handling cosmic weather in chat');
        const response = `I encountered an error reading the cosmic energy. Please try again in a moment.`;
        await storeMessage(userId, 'assistant', { text: response });
    }
}

/**
 * Detect and handle special requests (horoscope, moon phase, cosmic weather)
 * Returns true if handled, false if regular chat should proceed
 * 
 * @param {string} userId - User ID
 * @param {string} message - User message
 * @param {object} userInfo - User personal info
 * @param {object} astrologyInfo - User astrology info
 * @returns {Promise<boolean>} - True if handled, false to continue normal chat
 */
export async function detectAndHandleSpecialRequest(userId, message, userInfo, astrologyInfo) {
    try {
        if (isHoroscopeRequestInChat(message)) {
            await handleHoroscopeInChat(userId, userInfo);
            return true;
        }

        if (isMoonPhaseRequestInChat(message)) {
            const phase = extractMoonPhaseFromChat(message);
            await handleMoonPhaseInChat(userId, userInfo, phase);
            return true;
        }

        if (isCosmicWeatherRequestInChat(message)) {
            await handleCosmicWeatherInChat(userId);
            return true;
        }

        // No special request detected
        return false;
        } catch (err) {
        logErrorFromCatch(err, '[SPECIAL-REQUEST] Error detecting special request');
        // Return false to allow normal chat to proceed on error
        return false;
    }
}

