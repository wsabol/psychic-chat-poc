/**
 * SYNCHRONOUS CHAT PROCESSOR
 * Main orchestrator for direct chat message processing
 * Replaces the queue-based worker pattern with synchronous processing
 */

import { handleChatMessage } from './modules/handlers/chat-handler.js';
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
