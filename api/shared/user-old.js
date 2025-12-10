import { db } from './db.js'

export async function getRecentMessages(userId) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';
    const { rows: history } = await db.query(
        \SELECT 
            CASE 
                WHEN content_encrypted IS NOT NULL 
                THEN pgp_sym_decrypt(content_encrypted, \)::text
                ELSE content
            END as content
        FROM messages 
        WHERE user_id=\ AND role='user' 
        ORDER BY created_at DESC 
        LIMIT 10\,
        [userId, ENCRYPTION_KEY]
    );

    return history.map(msg => msg.content);
}

export async function insertMessage(userId, role, content) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';
    await db.query(
        \INSERT INTO messages(user_id, role, content_encrypted) 
         VALUES(\, \, pgp_sym_encrypt(\, \))\,
        [userId, role, content, ENCRYPTION_KEY]
    );
}
