// Delete all horoscopes with wrong date format
import { db } from './api/shared/db.js';
import { hashUserId } from './api/shared/hashUtils.js';
import { enqueueMessage } from './api/shared/queue.js';

const userId = '6S10sgn7ZaRvO8za13lJ2AGNYf43';

async function fix() {
    try {
        const userIdHash = hashUserId(userId);
        
        console.log('Deleting ALL horoscopes to force regeneration...');
        const result = await db.query(
            `DELETE FROM messages WHERE user_id_hash = $1 AND role = 'horoscope'`,
            [userIdHash]
        );
        console.log(`✅ Deleted ${result.rowCount} horoscope(s)`);
        
        console.log('\nTriggering fresh daily horoscope...');
        await enqueueMessage({
            userId,
            message: '[SYSTEM] Generate horoscope for daily'
        });
        console.log('✅ Daily horoscope queued');
        
        console.log('\nTriggering fresh weekly horoscope...');
        await enqueueMessage({
            userId,
            message: '[SYSTEM] Generate horoscope for weekly'
        });
        console.log('✅ Weekly horoscope queued');
        
        console.log('\n🎉 Done! Wait 15-20 seconds then refresh your app.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fix();
