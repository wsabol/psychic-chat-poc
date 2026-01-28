/**
 * Test Script: Check Phone Number Decryption
 * 
 * This will show you:
 * 1. What's actually stored in the database
 * 2. If pgcrypto decryption is working
 * 3. What value is being returned
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from './shared/db.js';
import { hashUserId } from './shared/hashUtils.js';

async function testPhoneDecryption() {
  try {
    console.log('\n=== PHONE NUMBER DECRYPTION TEST ===\n');
    
    // Get your user ID from environment or hardcode it
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('❌ Please provide userId as argument:');
      console.log('   node api/test-phone-decrypt.js YOUR_USER_ID');
      process.exit(1);
    }
    
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    console.log(`Testing for userId: ${userId}`);
    console.log(`Hashed: ${userIdHash}\n`);
    
    // Test 1: Check if row exists
    console.log('📋 Step 1: Check if security row exists...');
    const rowCheck = await db.query(
      `SELECT COUNT(*) as count FROM security WHERE user_id_hash = $1`,
      [userIdHash]
    );
    
    console.log(`   Result: ${rowCheck.rows[0].count} row(s) found`);
    
    if (rowCheck.rows[0].count === '0') {
      console.log('\n❌ No security row found for this user!');
      console.log('   The phone number might be stored under a different user ID.');
      process.exit(1);
    }
    
    // Test 2: Check raw encrypted data
    console.log('\n📋 Step 2: Check raw encrypted data...');
    const rawData = await db.query(
      `SELECT 
        phone_number_encrypted IS NOT NULL as has_phone,
        phone_verified,
        octet_length(phone_number_encrypted) as encrypted_length
       FROM security 
       WHERE user_id_hash = $1`,
      [userIdHash]
    );
    
    const raw = rawData.rows[0];
    console.log(`   Has phone data: ${raw.has_phone}`);
    console.log(`   Phone verified: ${raw.phone_verified}`);
    console.log(`   Encrypted length: ${raw.encrypted_length} bytes`);
    
    if (!raw.has_phone) {
      console.log('\n❌ phone_number_encrypted is NULL in database!');
      process.exit(1);
    }
    
    // Test 3: Try pgcrypto decryption
    console.log('\n📋 Step 3: Try pgcrypto decryption...');
    try {
      const decrypted = await db.query(
        `SELECT 
          pgp_sym_decrypt(phone_number_encrypted::bytea, $1::text) as phone_number
         FROM security 
         WHERE user_id_hash = $2`,
        [ENCRYPTION_KEY, userIdHash]
      );
      
      const phone = decrypted.rows[0]?.phone_number;
      
      if (phone) {
        console.log(`   ✅ SUCCESS! Decrypted phone: ${phone}`);
      } else {
        console.log(`   ⚠️  Decryption returned NULL or empty`);
        console.log(`   Raw value: ${JSON.stringify(decrypted.rows[0])}`);
      }
    } catch (decryptError) {
      console.log(`   ❌ Decryption FAILED: ${decryptError.message}`);
      console.log('\n   Possible causes:');
      console.log('   1. Wrong ENCRYPTION_KEY in .env');
      console.log('   2. Data was encrypted with different key');
      console.log('   3. Data is not pgcrypto encrypted');
    }
    
    // Test 4: Try the exact query from verificationService
    console.log('\n📋 Step 4: Test exact query from verificationService...');
    try {
      const result = await db.query(
        `SELECT 
          pgp_sym_decrypt(phone_number_encrypted::bytea, $1::text) as phone_number,
          pgp_sym_decrypt(recovery_phone_encrypted::bytea, $1::text) as recovery_phone,
          phone_verified, 
          recovery_phone_verified
         FROM security 
         WHERE user_id_hash = $2`,
        [ENCRYPTION_KEY, userIdHash]
      );
      
      console.log(`   Result:`, JSON.stringify(result.rows[0], null, 2));
    } catch (err) {
      console.log(`   ❌ Query failed: ${err.message}`);
    }
    
    console.log('\n=== TEST COMPLETE ===\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPhoneDecryption();
