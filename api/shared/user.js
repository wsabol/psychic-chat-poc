import { db } from './db.js';
import { hashUserId } from './hashUtils.js';

export async function getRecentMessages(userId) {
    // ✅ Using real encryption key from environment
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    const { rows: history } = await db.query(
        `SELECT 
            pgp_sym_decrypt(content_encrypted, $2)::text as content
        FROM messages 
        WHERE user_id_hash=$1 AND role='user' 
        ORDER BY created_at DESC 
        LIMIT 10`,
        [userIdHash, ENCRYPTION_KEY]
    );

    return history.map(msg => msg.content);
}

export async function insertMessage(userId, role, content) {
    // ✅ Using real encryption key from environment
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    await db.query(
        `INSERT INTO messages(user_id_hash, role, content_encrypted) 
         VALUES($1, $2, pgp_sym_encrypt($3, $4))`,
        [userIdHash, role, content, ENCRYPTION_KEY]
    );
}
