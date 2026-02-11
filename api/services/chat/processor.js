/**
 * SYNCHRONOUS CHAT PROCESSOR
 * Main orchestrator for direct processing of all chat-related operations
 * Replaces the queue-based worker pattern with synchronous processing
 */

import { handleChatMessage } from './modules/handlers/chat-handler.js';
import { generateHoroscope } from './modules/handlers/horoscope-handler.js';
import { generateMoonPhaseCommentary } from './modules/handlers/moon-phase-handler.js';
import { generateCosmicWeather } from './modules/handlers/cosmic-weather-handler.js';
import { generateLunarNodesInsight } from './modules/handlers/lunar-nodes-handler.js';
import { generateVoidOfCourseMoonAlert } from './modules/handlers/void-of-course-handler.js';
import { handleAstrologyCalculation } from './modules/handlers/astrology-handler.js';
import { storeMessage } from './modules/messages.js';
import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Process chat message synchronously
 * Stores user message, processes it, and returns the assistant's response
 * 
 * @param {string} userId - User ID
 * @param {string} message - User's message text
 * @returns {Promise<Object>} Assistant's response with content and metadata
 */
export async function processChatMessageSync(userId, message) {
    try {
        // STEP 1: Store user message first
        await storeMessage(userId, 'user', { text: message });
        
        // STEP 2: Process message (same as worker did)
        // This will handle all the logic: violations, special requests, oracle processing, etc.
        await handleChatMessage(userId, message);
        
        // STEP 3: Fetch and return the assistant's response (most recent message)
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
        const userIdHash = hashUserId(userId);
        
        const { rows } = await db.query(
            `SELECT 
                id,
                role,
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                response_type,
                created_at
             FROM messages 
             WHERE user_id_hash = $1 
             AND role != 'user'
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userIdHash, ENCRYPTION_KEY]
        );
        
        if (rows.length === 0) {
            throw new Error('No assistant response found after processing message');
        }
        
        const response = rows[0];
        
        // Parse JSON content if needed
        let contentFull = response.content_full;
        let contentBrief = response.content_brief;
        
        try {
            if (typeof contentFull === 'string') {
                contentFull = JSON.parse(contentFull);
            }
        } catch (e) {
            // Already parsed or not JSON
        }
        
        try {
            if (typeof contentBrief === 'string') {
                contentBrief = JSON.parse(contentBrief);
            }
        } catch (e) {
            // Already parsed or not JSON
        }
        
        return {
            success: true,
            id: response.id,
            role: response.role,
            contentFull: contentFull,
            contentBrief: contentBrief,
            responseType: response.response_type,
            createdAt: response.created_at
        };
        
    } catch (err) {
        logErrorFromCatch(err, '[CHAT-PROCESSOR] Error processing chat message synchronously');
        
        // Return error response
        return {
            success: false,
            error: err.message || 'Failed to process message',
            role: 'assistant',
            contentFull: { 
                text: 'I apologize, but I encountered an error processing your message. Please try again.' 
            },
            contentBrief: null
        };
    }
}

/**
 * Process horoscope generation synchronously
 * @param {string} userId - User ID
 * @param {string} range - 'daily' or 'weekly'
 * @returns {Promise<Object>} Generated horoscope
 */
export async function processHoroscopeSync(userId, range = 'daily') {
    try {
        
        // Generate horoscope (stores in DB automatically)
        await generateHoroscope(userId, range);
        
        // Fetch the generated horoscope
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
        const userIdHash = hashUserId(userId);
        
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                created_at
             FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'horoscope'
             AND horoscope_range = $3
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userIdHash, ENCRYPTION_KEY, range]
        );
        
        if (rows.length === 0) {
            throw new Error('Horoscope generation failed - no data found');
        }
        
        const horoscope = rows[0];
        
        // Parse JSON content
        let contentFull = horoscope.content_full;
        let contentBrief = horoscope.content_brief;
        
        try {
            if (typeof contentFull === 'string') {
                contentFull = JSON.parse(contentFull);
            }
            if (typeof contentBrief === 'string') {
                contentBrief = JSON.parse(contentBrief);
            }
        } catch (e) {
            // Already parsed
        }
        
        return {
            success: true,
            horoscope: contentFull?.text || contentFull,
            brief: contentBrief?.text || contentBrief,
            generated_at: contentFull?.generated_at || horoscope.created_at
        };
        
    } catch (err) {
        logErrorFromCatch(err, '[HOROSCOPE-PROCESSOR] Error generating horoscope');
        throw err;
    }
}

/**
 * Process moon phase commentary synchronously
 * @param {string} userId - User ID
 * @param {string} phase - Moon phase name
 * @returns {Promise<Object>} Generated moon phase commentary
 */
export async function processMoonPhaseSync(userId, phase) {
    try {
        
        // Generate moon phase commentary (stores in DB automatically)
        await generateMoonPhaseCommentary(userId, phase);
        
        // Fetch the generated commentary
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
        const userIdHash = hashUserId(userId);
        
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                created_at
             FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'moon_phase'
             AND moon_phase = $3
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userIdHash, ENCRYPTION_KEY, phase]
        );
        
        if (rows.length === 0) {
            throw new Error('Moon phase commentary generation failed - no data found');
        }
        
        const commentary = rows[0];
        
        // Parse JSON content
        let contentFull = commentary.content_full;
        let contentBrief = commentary.content_brief;
        
        try {
            if (typeof contentFull === 'string') {
                contentFull = JSON.parse(contentFull);
            }
            if (typeof contentBrief === 'string') {
                contentBrief = JSON.parse(contentBrief);
            }
        } catch (e) {
            // Already parsed
        }
        
        return {
            success: true,
            commentary: contentFull?.text || contentFull,
            brief: contentBrief?.text || contentBrief,
            generated_at: contentFull?.generated_at || commentary.created_at,
            phase: phase
        };
        
    } catch (err) {
        logErrorFromCatch(err, '[MOON-PHASE-PROCESSOR] Error generating moon phase commentary');
        throw err;
    }
}

/**
 * Process cosmic weather generation synchronously
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated cosmic weather
 */
export async function processCosmicWeatherSync(userId) {
    try {
        
        // Generate cosmic weather (stores in DB automatically)
        await generateCosmicWeather(userId);
        
        // Fetch the generated cosmic weather
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
        const userIdHash = hashUserId(userId);
        
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                created_at
             FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'cosmic_weather'
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userIdHash, ENCRYPTION_KEY]
        );
        
        if (rows.length === 0) {
            throw new Error('Cosmic weather generation failed - no data found');
        }
        
        const weather = rows[0];
        
        // Parse JSON content
        let contentFull = weather.content_full;
        let contentBrief = weather.content_brief;
        
        try {
            if (typeof contentFull === 'string') {
                contentFull = JSON.parse(contentFull);
            }
            if (typeof contentBrief === 'string') {
                contentBrief = JSON.parse(contentBrief);
            }
        } catch (e) {
            // Already parsed
        }
        
        return {
            success: true,
            weather: contentFull?.text || contentFull,
            brief: contentBrief?.text || contentBrief,
            birthChart: contentFull?.birth_chart || null,
            currentPlanets: contentFull?.planets || []
        };
        
    } catch (err) {
        logErrorFromCatch(err, '[COSMIC-WEATHER-PROCESSOR] Error generating cosmic weather');
        throw err;
    }
}

/**
 * Process lunar nodes insight synchronously
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated lunar nodes insight
 */
export async function processLunarNodesSync(userId) {
    try {
        
        // Generate lunar nodes insight (stores in DB automatically)
        await generateLunarNodesInsight(userId);
        
        // Fetch the generated insight
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
        const userIdHash = hashUserId(userId);
        
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                created_at
             FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'lunar_nodes'
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userIdHash, ENCRYPTION_KEY]
        );
        
        if (rows.length === 0) {
            throw new Error('Lunar nodes insight generation failed - no data found');
        }
        
        const insight = rows[0];
        
        // Parse JSON content
        let contentFull = insight.content_full;
        
        try {
            if (typeof contentFull === 'string') {
                contentFull = JSON.parse(contentFull);
            }
        } catch (e) {
            // Already parsed
        }
        
        return {
            success: true,
            insight: contentFull?.text || contentFull,
            nodes: {
                north: contentFull?.north_node_sign,
                south: contentFull?.south_node_sign
            }
        };
        
    } catch (err) {
        logErrorFromCatch(err, '[LUNAR-NODES-PROCESSOR] Error generating lunar nodes insight');
        throw err;
    }
}

/**
 * Process void of course moon alert synchronously
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated void of course alert
 */
export async function processVoidOfCourseSync(userId) {
    try {
        
        // Generate void of course alert (stores in DB automatically)
        await generateVoidOfCourseMoonAlert(userId);
        
        // Fetch the generated alert
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
        const userIdHash = hashUserId(userId);
        
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                created_at
             FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'void_of_course'
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userIdHash, ENCRYPTION_KEY]
        );
        
        if (rows.length === 0) {
            throw new Error('Void of course alert generation failed - no data found');
        }
        
        const alert = rows[0];
        
        // Parse JSON content
        let contentFull = alert.content_full;
        
        try {
            if (typeof contentFull === 'string') {
                contentFull = JSON.parse(contentFull);
            }
        } catch (e) {
            // Already parsed
        }
        
        return {
            success: true,
            is_void: contentFull?.is_void || false,
            alert: contentFull?.text || contentFull?.message || contentFull,
            phase: contentFull?.phase
        };
        
    } catch (err) {
        logErrorFromCatch(err, '[VOID-OF-COURSE-PROCESSOR] Error generating void of course alert');
        throw err;
    }
}

/**
 * Route job to appropriate handler (for backwards compatibility with worker pattern if needed)
 * This function is here for future extensibility but currently just calls handleChatMessage
 */
export async function routeJob(job) {
    const { userId, message } = job;
    
    try {
        await handleChatMessage(userId, message);
    } catch (err) {
        logErrorFromCatch(err, `[PROCESSOR] Error processing job for user ${userId}`);
        throw err;
    }
}
