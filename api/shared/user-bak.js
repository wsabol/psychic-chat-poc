import { db } from './db.js'

export async function getRecentMessages(userId) {
    // IMPORTANT: Use 'default_key' to decrypt old messages
    // New messages will also be encrypted with this key (from insertMessage below)
    const ENCRYPTION_KEY = 'default_key';
    const { rows: history } = await db.query(
        `SELECT 
            CASE 
                WHEN content_encrypted IS NOT NULL 
                THEN pgp_sym_decrypt(content_encrypted, $2)::text
                ELSE content
            END as content
        FROM messages 
        WHERE user_id=$1 AND role='user' 
        ORDER BY created_at DESC 
        LIMIT 10`,
        [userId, ENCRYPTION_KEY]
    );

    return history.map(msg => msg.content);
}

export async function insertMessage(userId, role, content) {
    // IMPORTANT: Use 'default_key' for consistency with getRecentMessages
    // This matches the key used for old encrypted messages
    const ENCRYPTION_KEY = 'default_key';
    // ✅ ENCRYPTION: Messages are encrypted with AES-256 at database level
    await db.query(
        `INSERT INTO messages(user_id, role, content_encrypted) 
         VALUES($1, $2, pgp_sym_encrypt($3, $4))`,
        [userId, role, content, ENCRYPTION_KEY]
    );
}
