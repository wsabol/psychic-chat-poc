import { db } from './db.js'

export async function getRecentMessages(userId) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';
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
    await db.query("INSERT INTO messages(user_id, role, content) VALUES($1,$2,$3)", [
        userId,
        role,
        content,
    ]);
}
