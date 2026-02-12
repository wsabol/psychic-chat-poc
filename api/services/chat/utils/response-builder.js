/**
 * Response Builder Utilities
 * Centralized response formatting for different message types
 */

import { parseMessageContent, extractText } from './json-parser.js';

/**
 * Build a standard success response
 * @param {Object} message - Raw message from database
 * @param {Function} customMapper - Optional custom response mapper
 * @returns {Object} Formatted response
 */
export function buildSuccessResponse(message, customMapper = null) {
    if (!message) {
        throw new Error('No message found to build response from');
    }
    
    // Parse JSON content
    const parsed = parseMessageContent(message);
    
    // If custom mapper provided, use it
    if (customMapper) {
        return {
            success: true,
            ...customMapper(parsed)
        };
    }
    
    // Default response format
    return {
        success: true,
        id: parsed.id,
        role: parsed.role,
        contentFull: parsed.content_full,
        contentBrief: parsed.content_brief,
        responseType: parsed.response_type,
        createdAt: parsed.created_at
    };
}

/**
 * Build an error response
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 * @returns {Object} Formatted error response
 */
export function buildErrorResponse(error, defaultMessage = 'Failed to process request') {
    return {
        success: false,
        error: error.message || defaultMessage,
        role: 'assistant',
        contentFull: { 
            text: 'I apologize, but I encountered an error processing your request. Please try again.' 
        },
        contentBrief: null
    };
}

/**
 * Response mapper for horoscope
 */
export function mapHoroscopeResponse(parsed) {
    const contentFull = parsed.content_full;
    const contentBrief = parsed.content_brief;
    
    return {
        horoscope: extractText(contentFull) || contentFull,
        brief: extractText(contentBrief) || contentBrief,
        generated_at: contentFull?.generated_at || parsed.created_at
    };
}

/**
 * Response mapper for moon phase
 */
export function mapMoonPhaseResponse(parsed, phase) {
    const contentFull = parsed.content_full;
    const contentBrief = parsed.content_brief;
    
    return {
        commentary: extractText(contentFull) || contentFull,
        brief: extractText(contentBrief) || contentBrief,
        generated_at: contentFull?.generated_at || parsed.created_at,
        phase: phase
    };
}

/**
 * Response mapper for cosmic weather
 */
export function mapCosmicWeatherResponse(parsed) {
    const contentFull = parsed.content_full;
    const contentBrief = parsed.content_brief;
    
    return {
        weather: extractText(contentFull) || contentFull,
        brief: extractText(contentBrief) || contentBrief,
        birthChart: contentFull?.birth_chart || null,
        currentPlanets: contentFull?.planets || []
    };
}

/**
 * Response mapper for lunar nodes
 */
export function mapLunarNodesResponse(parsed) {
    const contentFull = parsed.content_full;
    
    return {
        insight: extractText(contentFull) || contentFull,
        nodes: {
            north: contentFull?.north_node_sign,
            south: contentFull?.south_node_sign
        }
    };
}

/**
 * Response mapper for void of course
 */
export function mapVoidOfCourseResponse(parsed) {
    const contentFull = parsed.content_full;
    
    return {
        is_void: contentFull?.is_void || false,
        alert: extractText(contentFull) || contentFull?.message || contentFull,
        phase: contentFull?.phase
    };
}
