/**
 * SYNCHRONOUS CHAT PROCESSOR
 * Main orchestrator for direct processing of all chat-related operations
 * Refactored to use centralized utilities for better maintainability
 */

import { handleChatMessage } from './modules/handlers/chat-handler.js';
import { generateHoroscope } from './modules/handlers/horoscope-handler.js';
import { generateMoonPhaseCommentary } from './modules/handlers/moon-phase-handler.js';
import { generateCosmicWeather } from './modules/handlers/cosmic-weather-handler.js';
import { generateLunarNodesInsight } from './modules/handlers/lunar-nodes-handler.js';
import { generateVoidOfCourseMoonAlert } from './modules/handlers/void-of-course-handler.js';
import { storeMessage } from './modules/messages.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

// Import utilities
import { processGeneric, processWithErrorHandling } from './utils/base-processor.js';
import { fetchMessageByRole } from './utils/database-helpers.js';
import { buildSuccessResponse } from './utils/response-builder.js';
import {
    mapHoroscopeResponse,
    mapMoonPhaseResponse,
    mapCosmicWeatherResponse,
    mapLunarNodesResponse,
    mapVoidOfCourseResponse
} from './utils/response-builder.js';

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
        
        // STEP 2: Process message (handles violations, special requests, oracle processing, etc.)
        await handleChatMessage(userId, message);
        
        // STEP 3: Fetch and return the assistant's response (most recent non-user message)
        const assistantMessage = await fetchMessageByRole(userId, 'assistant');
        
        if (!assistantMessage) {
            throw new Error('No assistant response found after processing message');
        }
        
        // Build and return response
        return buildSuccessResponse(assistantMessage);
        
    } catch (err) {
        logErrorFromCatch(err, '[CHAT-PROCESSOR] Error processing chat message synchronously');
        
        // Return error response (don't throw - provide user-friendly response)
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
    return processGeneric({
        userId,
        generator: generateHoroscope,
        generatorArgs: [range],
        role: 'horoscope',
        filters: { horoscope_range: range },
        responseMapper: mapHoroscopeResponse,
        errorContext: 'HOROSCOPE-PROCESSOR',
        notFoundError: 'Horoscope generation failed - no data found'
    });
}

/**
 * Process moon phase commentary synchronously
 * @param {string} userId - User ID
 * @param {string} phase - Moon phase name
 * @returns {Promise<Object>} Generated moon phase commentary
 */
export async function processMoonPhaseSync(userId, phase) {
    return processGeneric({
        userId,
        generator: generateMoonPhaseCommentary,
        generatorArgs: [phase],
        role: 'moon_phase',
        filters: { moon_phase: phase },
        responseMapper: (parsed) => mapMoonPhaseResponse(parsed, phase),
        errorContext: 'MOON-PHASE-PROCESSOR',
        notFoundError: 'Moon phase commentary generation failed - no data found'
    });
}

/**
 * Process cosmic weather generation synchronously
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated cosmic weather
 */
export async function processCosmicWeatherSync(userId) {
    return processGeneric({
        userId,
        generator: generateCosmicWeather,
        generatorArgs: [],
        role: 'cosmic_weather',
        filters: {},
        responseMapper: mapCosmicWeatherResponse,
        errorContext: 'COSMIC-WEATHER-PROCESSOR',
        notFoundError: 'Cosmic weather generation failed - no data found'
    });
}

/**
 * Process lunar nodes insight synchronously
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated lunar nodes insight
 */
export async function processLunarNodesSync(userId) {
    return processGeneric({
        userId,
        generator: generateLunarNodesInsight,
        generatorArgs: [],
        role: 'lunar_nodes',
        filters: {},
        responseMapper: mapLunarNodesResponse,
        errorContext: 'LUNAR-NODES-PROCESSOR',
        notFoundError: 'Lunar nodes insight generation failed - no data found'
    });
}

/**
 * Process void of course moon alert synchronously
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated void of course alert
 */
export async function processVoidOfCourseSync(userId) {
    return processGeneric({
        userId,
        generator: generateVoidOfCourseMoonAlert,
        generatorArgs: [],
        role: 'void_of_course',
        filters: {},
        responseMapper: mapVoidOfCourseResponse,
        errorContext: 'VOID-OF-COURSE-PROCESSOR',
        notFoundError: 'Void of course alert generation failed - no data found'
    });
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
