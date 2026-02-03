// Check horoscope data format in database
import { db } from './api/shared/db.js';
import { hashUserId } from './api/shared/hashUtils.js';

const userId = process.argv[2];

if (!userId) {
    console.error('Usage: node check-horoscope-data.js <userId>');
    process.exit(1);
}

async function checkData() {
    try {
        const userIdHash = hashUserId(userId);
        
        // Check for horoscope messages
        const { rows } = await db.query(
            `SELECT 
                id,
                role,
                horoscope_range,
                language_code,
                created_at_local_date,
                created_at,
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief
             FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'horoscope'
             ORDER BY created_at DESC
             LIMIT 3`,
            [userIdHash, process.env.ENCRYPTION_KEY]
        );
        
        console.log(`Found ${rows.length} horoscope(s) for user ${userId}\n`);
        
        rows.forEach((row, index) => {
            console.log(`\n=== Horoscope ${index + 1} ===`);
            console.log('ID:', row.id);
            console.log('Range:', row.horoscope_range);
            console.log('Language:', row.language_code);
            console.log('Local Date:', row.created_at_local_date);
            console.log('Created At:', row.created_at);
            console.log('\nContent Full (raw):', row.content_full ? row.content_full.substring(0, 200) + '...' : 'NULL');
            console.log('\nContent Brief (raw):', row.content_brief ? row.content_brief.substring(0, 200) + '...' : 'NULL');
            
            // Try to parse
            if (row.content_full) {
                try {
                    const parsed = JSON.parse(row.content_full);
                    console.log('\nParsed Content Full:');
                    console.log('  - Has text?:', !!parsed.text);
                    console.log('  - Has generated_at?:', !!parsed.generated_at);
                    console.log('  - Keys:', Object.keys(parsed));
                } catch (e) {
                    console.log('\n❌ Failed to parse content_full:', e.message);
                }
            }
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkData();
