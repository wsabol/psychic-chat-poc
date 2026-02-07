/**
 * Check user's birth data in database
 * Run with: node check-birth-data.js YOUR_USER_ID
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './api/.env' });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const userId = process.argv[2];

if (!userId) {
    console.error('❌ Please provide a user ID');
    console.error('Usage: node check-birth-data.js YOUR_USER_ID');
    process.exit(1);
}

pool.query(`
    SELECT 
        user_id,
        pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date,
        pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time,
        pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country,
        pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province,
        pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city,
        pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone
    FROM user_personal_info 
    WHERE user_id = $2
`, [process.env.ENCRYPTION_KEY, userId])
    .then(result => {
        if (result.rows.length === 0) {
            pool.end();
            return;
        }
        
        const data = result.rows[0];
        
        // Check if all required fields are present
        const hasAllRequired = data.birth_date && data.birth_time && 
                              data.birth_country && data.birth_province && data.birth_city;
        
        
        pool.end();
    })
    .catch(err => {
        console.error('❌ Database error:', err.message);
        pool.end();
        process.exit(1);
    });
