/**
 * Migration: add-google-play-billing
 *
 * Adds Google Play Billing columns to user_personal_info so that the
 * existing subscription infrastructure (subscriptionCheckJob, etc.) stays
 * intact while we extend it for Google Play IAP.
 *
 * New columns:
 *   billing_platform         — 'stripe' | 'google_play' | 'apple' (which system owns the active sub)
 *   google_play_purchase_token — the purchase token returned by Google Play after a purchase
 *   google_play_product_id   — the Google Play product ID (e.g. starship_psychics_monthly)
 *   google_play_order_id     — the Google Play order ID for reference / support
 *
 * Run with:
 *   node api/migrations/add-google-play-billing.js
 */
import { db } from '../shared/db.js';

async function up() {
  console.log('[Migration] Running add-google-play-billing...');

  await db.query(`
    ALTER TABLE user_personal_info
      ADD COLUMN IF NOT EXISTS billing_platform VARCHAR(20) DEFAULT 'stripe',
      ADD COLUMN IF NOT EXISTS google_play_purchase_token TEXT,
      ADD COLUMN IF NOT EXISTS google_play_product_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS google_play_order_id VARCHAR(255);
  `);

  // Index for looking up users by their active Google Play token
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_google_play_purchase_token
      ON user_personal_info(google_play_purchase_token)
      WHERE google_play_purchase_token IS NOT NULL;
  `);

  console.log('[Migration] add-google-play-billing complete ✓');
}

async function down() {
  console.log('[Migration] Rolling back add-google-play-billing...');

  await db.query(`
    ALTER TABLE user_personal_info
      DROP COLUMN IF EXISTS billing_platform,
      DROP COLUMN IF EXISTS google_play_purchase_token,
      DROP COLUMN IF EXISTS google_play_product_id,
      DROP COLUMN IF EXISTS google_play_order_id;
  `);

  await db.query(`
    DROP INDEX IF EXISTS idx_google_play_purchase_token;
  `);

  console.log('[Migration] Rollback complete ✓');
}

// Run if called directly
const command = process.argv[2];
if (command === 'down') {
  down().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
} else {
  up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
