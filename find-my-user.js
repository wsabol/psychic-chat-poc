// Find user ID by email
import { db } from './api/shared/db.js';

async function findUser() {
    try {
        const { rows } = await db.query(
            `SELECT user_id, 
                    pgp_sym_decrypt(email_encrypted, $1) as email,
                    pgp_sym_decrypt(first_name_encrypted, $1) as first_name
             FROM user_personal_info 
             WHERE pgp_sym_decrypt(email_encrypted, $1) LIKE '%stuathome87%'
             LIMIT 5`,
            [process.env.ENCRYPTION_KEY]
        );
        
        if (rows.length === 0) {
            console.log('No users found with that email');
            
            // Try to find ANY user
            const { rows: anyUser } = await db.query(
                `SELECT user_id, 
                        pgp_sym_decrypt(email_encrypted, $1) as email,
                        pgp_sym_decrypt(first_name_encrypted, $1) as first_name
                 FROM user_personal_info 
                 WHERE user_id NOT LIKE 'temp_%'
                 ORDER BY created_at DESC
                 LIMIT 5`,
                [process.env.ENCRYPTION_KEY]
            );
            
            console.log('\nRecent non-temp users:');
            anyUser.forEach(u => {
                console.log(`  user_id: ${u.user_id}`);
                console.log(`  email: ${u.email}`);
                console.log(`  name: ${u.first_name}`);
                console.log('---');
            });
        } else {
            console.log('Found user(s):');
            rows.forEach(u => {
                console.log(`  user_id: ${u.user_id}`);
                console.log(`  email: ${u.email}`);
                console.log(`  name: ${u.first_name}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

findUser();
