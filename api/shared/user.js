import { db } from './db.js';
import { hashUserId } from './hashUtils.js';
import { getLocalDateForTimezone } from './timezoneHelper.js';

export async function getRecentMessages(userId) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    const { rows: history } = await db.query(
        `SELECT 
            pgp_sym_decrypt(content_full_encrypted, $2)::text as content
        FROM messages 
        WHERE user_id_hash=$1 AND role='user' 
        ORDER BY created_at DESC 
        LIMIT 10`,
        [userIdHash, ENCRYPTION_KEY]
    );

    return history.map(msg => msg.content);
}

export async function insertMessage(userId, role, content, contentBrief = null, timezone = 'UTC') {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    const localDate = getLocalDateForTimezone(timezone);
    
    // Ensure content is stringified if it's an object
    const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
    const contentBriefStr = contentBrief ? (typeof contentBrief === 'object' ? JSON.stringify(contentBrief) : contentBrief) : null;
    const responseType = contentBriefStr ? 'both' : 'full';
    
    // Use parameterized query - no string interpolation
    if (contentBriefStr) {
        await db.query(
            `INSERT INTO messages(user_id_hash, role, content_full_encrypted, content_brief_encrypted, response_type, created_at_local_date) 
             VALUES($1, $2, pgp_sym_encrypt($3, $4), pgp_sym_encrypt($5, $4), $6, $7)`,
            [userIdHash, role, contentStr, ENCRYPTION_KEY, contentBriefStr, responseType, localDate]
        );
    } else {
        await db.query(
            `INSERT INTO messages(user_id_hash, role, content_full_encrypted, content_brief_encrypted, response_type, created_at_local_date) 
             VALUES($1, $2, pgp_sym_encrypt($3, $4), NULL, $5, $6)`,
            [userIdHash, role, contentStr, ENCRYPTION_KEY, responseType, localDate]
        );
    }
}
