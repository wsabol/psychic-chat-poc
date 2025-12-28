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
            `SELECT role, pgp_sym_decrypt(content_full_encrypted, $1) as content 
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
 * Stores both English (US) and optional language translation in new columns
 * 
 * @param {string} userId - User ID
 * @param {string} role - Message role (user, assistant, horoscope, moon_phase, etc)
 * @param {object} contentFull - Full content object (always in English US)
 * @param {object} contentBrief - Brief content object (always in English US)
 * @param {string} languageCode - User's preferred language (e.g., 'es-ES', 'fr-FR')
 * @param {object} contentFullLang - Full content translated to preferred language
 * @param {object} contentBriefLang - Brief content translated to preferred language
 */
export async function storeMessage(userId, role, contentFull, contentBrief = null, languageCode = null, contentFullLang = null, contentBriefLang = null) {
    try {
        const userIdHash = hashUserId(userId);
        const fullStr = JSON.stringify(contentFull).substring(0, 200);
        const briefStr = contentBrief ? JSON.stringify(contentBrief).substring(0, 200) : 'NULL';
        console.log('[MESSAGES] Storing:', { 
            role, 
            fullLength: JSON.stringify(contentFull).length, 
            briefLength: contentBrief ? JSON.stringify(contentBrief).length : 0, 
            fullPreview: fullStr, 
            briefPreview: briefStr, 
            languageCode 
        });
        
        // Build query based on whether we have language-specific content
        let query;
        let params;
        
        if (languageCode && languageCode !== 'en-US' && contentFullLang) {
            // Store both English (baseline) and preferred language versions
            query = `INSERT INTO messages(user_id_hash, role, content_full_encrypted, content_brief_encrypted, content_full_lang_encrypted, content_brief_lang_encrypted, language_code, response_type) 
                     VALUES($1, $2, pgp_sym_encrypt($3, $6), pgp_sym_encrypt($4, $6), pgp_sym_encrypt($5, $6), pgp_sym_encrypt($7, $6), $8, 'both')`;
            params = [
                userIdHash,
                role,
                JSON.stringify(contentFull),
                JSON.stringify(contentBrief || { text: '', cards: [] }),
                JSON.stringify(contentFullLang),
                process.env.ENCRYPTION_KEY,
                JSON.stringify(contentBriefLang || { text: '', cards: [] }),
                languageCode
            ];
        } else {
            // Store only English (baseline) - no language-specific content
            query = `INSERT INTO messages(user_id_hash, role, content_full_encrypted, content_brief_encrypted, response_type) 
                     VALUES($1, $2, pgp_sym_encrypt($3, $4), pgp_sym_encrypt($5, $4), 'both')`;
            params = [
                userIdHash,
                role,
                JSON.stringify(contentFull),
                process.env.ENCRYPTION_KEY,
                JSON.stringify(contentBrief || { text: '', cards: [] })
            ];
        }
        
        await db.query(query, params);
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
