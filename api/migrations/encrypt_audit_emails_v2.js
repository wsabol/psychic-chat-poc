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
import { logErrorFromCatch } from '../shared/errorLogger.js';

// Load environment variables
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!ENCRYPTION_KEY) {
  logErrorFromCatch(new Error('ENCRYPTION_KEY not found in .env'), 'migration', 'startup');
  process.exit(1);
}

if (!DATABASE_URL) {
  logErrorFromCatch(new Error('DATABASE_URL not found in .env'), 'migration', 'startup');
  process.exit(1);
}

// Create database connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function migrateAuditLogEmails() {
  const client = await pool.connect();
  try {

    // Step 1: Get count of rows with plain text emails
    const countResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM audit_log 
      WHERE details ? 'email' 
        AND details->>'email' IS NOT NULL 
        AND email_encrypted IS NULL
    `);
    
    const rowsToEncrypt = parseInt(countResult.rows[0].count);

    if (rowsToEncrypt === 0) {
      return;
    }

    // Step 2: Encrypt emails using pgp_sym_encrypt
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

    // Step 3: Verify encryption
    const verifyResult = await client.query(`
      SELECT COUNT(*) as encrypted_count 
      FROM audit_log 
      WHERE email_encrypted IS NOT NULL
    `);
    
    const encryptedTotal = parseInt(verifyResult.rows[0].encrypted_count);

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

    } catch (error) {
    logErrorFromCatch(error, 'migration', 'encrypt audit emails v2');
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
migrateAuditLogEmails()
  .then(() => {
    pool.end();
    process.exit(0);
  })
    .catch(async (error) => {
    logErrorFromCatch(error, 'migration', 'fatal error');
    pool.end();
    process.exit(1);
  });
