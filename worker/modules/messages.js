import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';

/**
 * Get message history for a user
 * ✅ ENCRYPTED: Decrypts content_encrypted column
 * Returns messages in ASC order (oldest first) for proper conversation context
 */
export async function getMessageHistory(userId, limit = 10) {
    try {
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query(
            `SELECT role, pgp_sym_decrypt(content_encrypted, $1) as content 
             FROM messages 
             WHERE user_id_hash=$2 
             ORDER BY created_at ASC 
             LIMIT $3`,
            [process.env.ENCRYPTION_KEY, userIdHash, limit]
        );
        
        // Transform messages for OpenAI API
        return rows.map(msg => {
            // Parse content if it's JSON
            let parsedContent = msg.content;
            if (typeof parsedContent === 'string') {
                try {
                    parsedContent = JSON.parse(parsedContent);
                } catch (e) {
                    // Already a string, not JSON
                }
            }
            
            // Extract text content
            let textContent = '';
            if (typeof parsedContent === 'string') {
                textContent = parsedContent;
            } else if (parsedContent && typeof parsedContent === 'object' && parsedContent.text) {
                textContent = parsedContent.text;
            } else if (parsedContent && typeof parsedContent === 'object') {
                // Fallback: stringify if it's an object
                textContent = JSON.stringify(parsedContent);
            }
            
            return {
                role: msg.role,
                content: textContent
            };
        });
    } catch (err) {
        console.error('[MESSAGES] Error fetching history:', err);
        return [];
    }
}

/**
 * Store a message in database
 * ✅ ENCRYPTED: Stores content_encrypted using ENCRYPTION_KEY from .env
 */
export async function storeMessage(userId, role, content) {
    try {
        const userIdHash = hashUserId(userId);
        await db.query(
            `INSERT INTO messages(user_id_hash, role, content_encrypted) 
             VALUES($1, $2, pgp_sym_encrypt($3, $4))`,
            [userIdHash, role, JSON.stringify(content), process.env.ENCRYPTION_KEY]
        );
    } catch (err) {
        console.error('[MESSAGES] Error storing message:', err);
        throw err;
    }
}

/**
 * Format message for storage - combine text and metadata
 */
export function formatMessageContent(text, cards = null) {
    const content = { text };
    if (cards && cards.length > 0) {
        content.cards = cards;
    }
    return content;
}
