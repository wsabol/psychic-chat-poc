import { db } from '../shared/db.js';

/**
 * Get message history for a user
 */
export async function getMessageHistory(userId, limit = 10) {
    try {
        const { rows } = await db.query(
            "SELECT role, content FROM messages WHERE user_id=$1 ORDER BY created_at ASC LIMIT $2",
            [userId, limit]
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
 */
export async function storeMessage(userId, role, content) {
    try {
        await db.query(
            "INSERT INTO messages(user_id, role, content) VALUES($1, $2, $3)",
            [userId, role, JSON.stringify(content)]
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
