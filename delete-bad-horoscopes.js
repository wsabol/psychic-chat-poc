// Delete all horoscopes with wrong date format
import { db } from './api/shared/db.js';
import { hashUserId } from './api/shared/hashUtils.js';
import { enqueueMessage } from './api/shared/queue.js';

const userId = '6S10sgn7ZaRvO8za13lJ2AGNYf43';

async function fix() {
    try {
        const userIdHash = hashUserId(userId);
        const result = await db.query(
            `DELETE FROM messages WHERE user_id_hash = $1 AND role = 'horoscope'`,
            [userIdHash]
        );
        await enqueueMessage({
            userId,
            message: '[SYSTEM] Generate horoscope for daily'
        });
        await enqueueMessage({
            userId,
            message: '[SYSTEM] Generate horoscope for weekly'
        });
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fix();
