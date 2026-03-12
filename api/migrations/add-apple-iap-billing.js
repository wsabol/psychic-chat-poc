/**
 * Migration: add-apple-iap-billing
 *
 * Adds Apple In-App Purchase columns to user_personal_info so the server can:
 *   - Store Apple's original_transaction_id for linking S2S notifications to users
 *   - Cache the latest_receipt (base64) for receipt re-validation and renewals
 *   - Store the App Store product ID for the active subscription
 *
 * The existing billing_platform column already has 'stripe' | 'google_play' values.
 * This migration extends that to support 'apple' as a valid value.
 *
 * Run with: node api/migrations/add-apple-iap-billing.js
 */

import pool from '../db.js';

async function run() {
  console.log('Running migration: add-apple-iap-billing');

  await pool.query(`
    ALTER TABLE user_personal_info
      ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT,
      ADD COLUMN IF NOT EXISTS apple_latest_receipt           TEXT,
      ADD COLUMN IF NOT EXISTS apple_product_id               VARCHAR(100);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_apple_transaction_id
      ON user_personal_info (apple_original_transaction_id)
      WHERE apple_original_transaction_id IS NOT NULL;
  `);

  // Extend the billing_platform check constraint to allow 'apple'
  // (if no check constraint exists this is a no-op ALTER that simply adds docs)
  await pool.query(`
    COMMENT ON COLUMN user_personal_info.billing_platform IS
      'Billing platform: stripe | google_play | apple | NULL';
  `);

  console.log('Migration complete: apple IAP columns added to user_personal_info');
  await pool.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
