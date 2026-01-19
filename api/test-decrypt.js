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

    const result = await client.query(`
      SELECT 
        user_id,
        pgp_sym_decrypt(first_name_encrypted::bytea, $1) as decrypted_first_name
      FROM user_personal_info 
      LIMIT 1;
    `, [process.env.ENCRYPTION_KEY]);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

testDecryption();