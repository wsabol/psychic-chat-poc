/**
 * Test if worker's ENCRYPTION_KEY can decrypt user_personal_info data
 * Run with: node test-encryption.js
 */

import dotenv from 'dotenv';
import { db } from './worker/shared/db.js';

// Load worker's environment variables
dotenv.config({ path: './worker/.env' });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const TEST_USER_ID = 'AHxyRwbLbGN5GkGMw5nCAZ8CAdH3'; // The failing user

console.log('Testing decryption with worker ENCRYPTION_KEY...');
console.log('Testing userId:', TEST_USER_ID);
console.log('Key length:', ENCRYPTION_KEY ? ENCRYPTION_KEY.length : 'UNDEFINED');

async function testDecryption() {
  try {
    const { rows } = await db.query(`
      SELECT 
        user_id,
        pgp_sym_decrypt(email_encrypted, $1) as email,
        pgp_sym_decrypt(first_name_encrypted, $1) as first_name
      FROM user_personal_info 
      WHERE user_id = $2
    `, [ENCRYPTION_KEY, TEST_USER_ID]);
    
    if (rows.length === 0) {
      console.log('❌ NO USER FOUND with userId:', TEST_USER_ID);
    } else {
      console.log('✅ DECRYPTION SUCCESSFUL!');
      console.log('Email:', rows[0].email);
      console.log('First Name:', rows[0].first_name);
    }
  } catch (err) {
    console.log('❌ DECRYPTION FAILED!');
    console.log('Error:', err.message);
    console.log('This confirms the data was encrypted with a different key.');
  } finally {
    process.exit(0);
  }
}

testDecryption();
