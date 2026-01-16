#!/usr/bin/env node

/**
 * Encrypt Existing Audit Log Emails
 * 
 * This script migrates plain text emails from audit_log.details JSONB column
 * to the new encrypted audit_log.email_encrypted column.
 * 
 * Usage: node api/migrations/encrypt_audit_emails.js
 * 
 * Requires: .env file with ENCRYPTION_KEY and DB connection variables
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { logErrorFromCatch } from '../shared/errorLogger.js';

// Load environment variables
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST || 'db';  // 'db' for Docker, 'localhost' for local dev
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'chatbot';

if (!ENCRYPTION_KEY) {
  logErrorFromCatch(error, 'app', 'Error handling');
  process.exit(1);
}

// Create database connection pool
const pool = new Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
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
    logErrorFromCatch(error, 'migration', 'encrypt audit emails');
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
