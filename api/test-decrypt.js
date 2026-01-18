// api/test-decrypt.js
import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Client } = pkg;

async function testDecryption() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const result = await client.query(`
      SELECT 
        user_id,
        pgp_sym_decrypt(first_name_encrypted::bytea, $1) as decrypted_first_name
      FROM user_personal_info 
      LIMIT 1;
    `, [process.env.ENCRYPTION_KEY]);

    if (result.rows.length === 0) {
      console.log('❌ No records in user_personal_info');
      return;
    }

    console.log('✓ Decryption successful!');
    console.log('Result:', result.rows[0]);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

testDecryption();