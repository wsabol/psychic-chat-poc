// Fix horoscope issue immediately
import { db } from './api/shared/db.js';
import { hashUserId } from './api/shared/hashUtils.js';
import { enqueueMessage } from './api/shared/queue.js';

const userId = '6S10sgn7ZaRvO8za13lJ2AGNYf43';

async function fix() {
    try {
        const userIdHash = hashUserId(userId);
        
        console.log('1. Checking timezone preference...');
        const { rows: prefRows } = await db.query(
            `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        
        if (prefRows.length === 0 || !prefRows[0].timezone) {
            console.log('❌ Timezone not set! Setting to America/Chicago...');
            await db.query(
                `INSERT INTO user_preferences (user_id_hash, timezone) 
                 VALUES ($1, 'America/Chicago')
                 ON CONFLICT (user_id_hash) DO UPDATE SET timezone = 'America/Chicago'`,
                [userIdHash]
            );
            console.log('✅ Timezone set to America/Chicago');
        } else {
            console.log('✅ Timezone:', prefRows[0].timezone);
        }
        
        console.log('\n2. Checking horoscope data...');
        const { rows: horoscopeRows } = await db.query(
            `SELECT id, horoscope_range, created_at_local_date, created_at
             FROM messages 
             WHERE user_id_hash = $1 AND role = 'horoscope'
             ORDER BY created_at DESC
             LIMIT 5`,
            [userIdHash]
        );
        
        console.log(`Found ${horoscopeRows.length} horoscope(s)`);
        horoscopeRows.forEach(h => {
            console.log(`  - ${h.horoscope_range}: local_date=${h.created_at_local_date}, created=${h.created_at}`);
        });
        
        if (horoscopeRows.length > 0 && horoscopeRows[0].created_at_local_date === '2026-02-03') {
            console.log('\n3. Deleting incorrect horoscope with future date...');
            await db.query(
                `DELETE FROM messages WHERE user_id_hash = $1 AND role = 'horoscope' AND created_at_local_date = '2026-02-03'`,
                [userIdHash]
            );
            console.log('✅ Deleted future-dated horoscope');
        }
        
        console.log('\n4. Triggering fresh horoscope generation...');
        await enqueueMessage({
            userId,
            message: '[SYSTEM] Generate horoscope for daily'
        });
        console.log('✅ Horoscope generation queued');
        
        console.log('\n🎉 Done! Check back in 10-15 seconds for your horoscope.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fix();
