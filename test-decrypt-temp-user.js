/**
 * Test decrypting the specific temp user's data
 * Run with: node test-decrypt-temp-user.js
 */

import dotenv from 'dotenv';
import { db } from './worker/shared/db.js';

// Load worker's environment variables
dotenv.config({ path: './worker/.env' });

const WORKER_KEY = process.env.ENCRYPTION_KEY;
const TEST_USER_ID = 'VJHh14M8FsUgPgSOtiKMOZDOk1V2'; // The failing temp user

console.log('Testing decryption of temp user with worker ENCRYPTION_KEY...');
console.log('Worker key preview:', `${WORKER_KEY.substring(0, 4)}...${WORKER_KEY.substring(WORKER_KEY.length - 4)}`);
console.log('Key length:', WORKER_KEY.length);
console.log('Testing userId:', TEST_USER_ID);

async function testDecryption() {
  try {
    // Test if we can decrypt the data
    const { rows } = await db.query(`
      SELECT 
        user_id,
        pgp_sym_decrypt(email_encrypted, $1) as email,
        pgp_sym_decrypt(first_name_encrypted, $1) as first_name,
        pgp_sym_decrypt(last_name_encrypted, $1) as last_name,
        created_at
      FROM user_personal_info 
      WHERE user_id = $2
    `, [WORKER_KEY, TEST_USER_ID]);
    
    if (rows.length === 0) {
      console.log('\n❌ NO USER FOUND with userId:', TEST_USER_ID);
    } else {
      console.log('\n✅ DECRYPTION SUCCESSFUL!');
      console.log('Email:', rows[0].email);
      console.log('First Name:', rows[0].first_name);
      console.log('Last Name:', rows[0].last_name);
      console.log('Created:', rows[0].created_at);
    }
  } catch (err) {
    console.log('\n❌ DECRYPTION FAILED!');
    console.log('Error:', err.message);
    console.log('\nThis means the row was encrypted with a DIFFERENT key than what worker/.env contains');
    
    // Now try with API's key
    console.log('\n--- Now testing with API key ---');
    dotenv.config({ path: './api/.env' });
    const API_KEY = process.env.ENCRYPTION_KEY;
    console.log('API key preview:', `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);
    console.log('Keys match:', WORKER_KEY === API_KEY);
    
    if (WORKER_KEY !== API_KEY) {
      console.log('\n🔍 FOUND THE PROBLEM: API and Worker have DIFFERENT keys!');
      console.log('Even though previews looked the same, the full keys differ.');
    }
  } finally {
    process.exit(0);
  }
}

testDecryption();
