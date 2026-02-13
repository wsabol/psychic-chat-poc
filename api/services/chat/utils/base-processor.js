/**
 * Base Processor Pattern
 * Generic processor that handles the common pattern:
 * 1. Generate content (via handler)
 * 2. Fetch generated content from database
 * 3. Parse and format response
 * 4. Handle errors consistently
 */

import { fetchMessageByRole } from './database-helpers.js';
import { buildSuccessResponse, buildErrorResponse } from './response-builder.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Generic processor for all message generation types
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.userId - User ID
 * @param {Function} config.generator - Function that generates/stores the content
 * @param {Array} config.generatorArgs - Arguments to pass to generator (after userId)
 * @param {string} config.role - Message role to fetch
 * @param {Object} config.filters - Additional database filters
 * @param {Function} config.responseMapper - Custom response mapping function
 * @param {string} config.errorContext - Context for error logging
 * @param {string} config.notFoundError - Error message if no data found
 * @returns {Promise<Object>} Formatted response
 */
export async function processGeneric(config) {
    const {
        userId,
        generator,
        generatorArgs = [],
        role,
        filters = {},
        responseMapper = null,
        errorContext = 'PROCESSOR',
        notFoundError = 'Generation failed - no data found'
    } = config;
    
    try {
        // STEP 1: Generate content (stores in DB automatically)
        const generatorResult = await generator(userId, ...generatorArgs);
        
        // STEP 2: Fetch the generated content
        const message = await fetchMessageByRole(userId, role, filters);
        
        if (!message) {
            console.error(`[${errorContext}] No message found in database after generation!`);
            throw new Error(notFoundError);
        }
        
        // STEP 3: Build and return response
        const response = buildSuccessResponse(message, responseMapper);
        
        return response;
        
    } catch (err) {
        console.error(`[${errorContext}] ERROR in processGeneric:`, err.message);
        console.error(`[${errorContext}] ERROR stack:`, err.stack);
        logErrorFromCatch(err, `[${errorContext}] Error processing request`);
        throw err;
    }
}

/**
 * Process with custom error handling (returns error response instead of throwing)
 * Used for chat messages where we want to return a user-friendly error
 */
export async function processWithErrorHandling(config) {
    try {
        return await processGeneric(config);
    } catch (err) {
        logErrorFromCatch(err, `[${config.errorContext}] Error with error handling`);
        return buildErrorResponse(err, config.defaultErrorMessage);
    }
}
