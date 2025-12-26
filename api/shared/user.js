import { db } from './db.js';
import { hashUserId } from './hashUtils.js';

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

export async function insertMessage(userId, role, content, contentBrief = null) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    await db.query(
        `INSERT INTO messages(user_id_hash, role, content_full_encrypted, content_brief_encrypted, response_type) 
         VALUES($1, $2, pgp_sym_encrypt($3, $4), ${contentBrief ? 'pgp_sym_encrypt($5, $4)' : 'NULL'}, ${contentBrief ? "'both'" : "'full'"})`,
        contentBrief ? [userIdHash, role, content, ENCRYPTION_KEY, contentBrief] : [userIdHash, role, content, ENCRYPTION_KEY]
    );
}
