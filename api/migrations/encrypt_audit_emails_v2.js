#!/usr/bin/env node

/**
 * Encrypt Existing Audit Log Emails - Version 2
 * 
 * This script migrates plain text emails from audit_log.details JSONB column
 * to the new encrypted audit_log.email_encrypted column.
 * 
 * Usage: node api/migrations/encrypt_audit_emails_v2.js
 * 
 * Requires: .env file with ENCRYPTION_KEY and DATABASE_URL
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!ENCRYPTION_KEY) {
  console.error('❌ ERROR: ENCRYPTION_KEY not found in .env');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in .env');
  process.exit(1);
}

console.log(`🔐 Using ENCRYPTION_KEY from .env`);
console.log(`📦 Using DATABASE_URL: ${DATABASE_URL.replace(/:[^@]*@/, ':***@')}`);

// Create database connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function migrateAuditLogEmails() {
  const client = await pool.connect();
  try {
    console.log('\n📋 Starting audit_log email encryption migration...\n');

    // Step 1: Get count of rows with plain text emails
    const countResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM audit_log 
      WHERE details ? 'email' 
        AND details->>'email' IS NOT NULL 
        AND email_encrypted IS NULL
    `);
    
    const rowsToEncrypt = parseInt(countResult.rows[0].count);
    console.log(`Found ${rowsToEncrypt} rows with plain text emails to encrypt\n`);

    if (rowsToEncrypt === 0) {
      console.log('✅ No rows to encrypt - all done!');
      return;
    }

    // Step 2: Encrypt emails using pgp_sym_encrypt
    console.log('🔄 Encrypting emails...');
    const updateResult = await client.query(`
      UPDATE audit_log
      SET email_encrypted = pgp_sym_encrypt(
        details->>'email',
        $1
      )
      WHERE details ? 'email'
        AND details->>'email' IS NOT NULL
        AND email_encrypted IS NULL
      RETURNING id
    `, [ENCRYPTION_KEY]);

    const encrypted = updateResult.rowCount;
    console.log(`✅ Encrypted ${encrypted} email(s)\n`);

    // Step 3: Verify encryption
    const verifyResult = await client.query(`
      SELECT COUNT(*) as encrypted_count 
      FROM audit_log 
      WHERE email_encrypted IS NOT NULL
    `);
    
    const encryptedTotal = parseInt(verifyResult.rows[0].encrypted_count);
    console.log(`📊 Total encrypted emails in audit_log: ${encryptedTotal}`);

    // Step 4: Show sample of encrypted data (proving encryption works)
    const sampleResult = await client.query(`
      SELECT 
        id,
        action,
        details->>'email' as plain_email_still_in_details,
        CASE 
          WHEN email_encrypted IS NOT NULL THEN '✅ ENCRYPTED'
          ELSE '❌ NOT ENCRYPTED'
        END as status
      FROM audit_log 
      WHERE details ? 'email'
      LIMIT 3
    `);

    console.log('\n📌 Sample rows (showing encryption worked):');
    console.log('─'.repeat(80));
    sampleResult.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Action: ${row.action}`);
      console.log(`Plain email still in details: ${row.plain_email_still_in_details}`);
      console.log(`Status: ${row.status}`);
      console.log('─'.repeat(80));
    });

    // Step 5: Show warning about cleaning up plain text emails
    console.log('\n⚠️  IMPORTANT: Plain text emails still exist in audit_log.details JSONB column');
    console.log('   They have been COPIED to email_encrypted, but the originals remain.');
    console.log('\n   To remove them, run:');
    console.log('   UPDATE audit_log SET details = details - \'email\' WHERE details ? \'email\';');
    console.log('\n   This should be done AFTER verifying the encrypted data is working.\n');

    console.log('✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
migrateAuditLogEmails()
  .then(() => {
    console.log('Done! Closing connection...\n');
    pool.end();
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    pool.end();
    process.exit(1);
  });
