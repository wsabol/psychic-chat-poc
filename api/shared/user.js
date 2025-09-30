import { db } from './db'

export async function getRecentMessages(userId) {
    const { rows: history } = await db.query(
        "SELECT content FROM messages WHERE user_id=$1 AND role='user' ORDER BY created_at DESC LIMIT 10",
        [userId]
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
