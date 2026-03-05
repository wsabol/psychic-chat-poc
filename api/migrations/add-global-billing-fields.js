/**
 * Migration: add-global-billing-fields
 *
 * Adds two new columns to user_personal_info that support global multi-currency
 * Stripe billing and automatic tax collection:
 *
 *   country_code          VARCHAR(2)  — ISO 3166-1 alpha-2 country code derived from the
 *                                       customer's billing address (e.g. 'US', 'BR', 'DE').
 *                                       Not PII; stored plain.  Used to select the correct
 *                                       subscription currency and local payment methods.
 *
 *   subscription_currency VARCHAR(3)  — ISO 4217 currency code of the active subscription
 *                                       (e.g. 'usd', 'brl', 'eur').  Stored at subscription
 *                                       creation time; cannot be changed without cancelling
 *                                       and re-creating the subscription in Stripe.
 *
 * Run:   node api/migrations/add-global-billing-fields.js
 * Roll back: node api/migrations/add-global-billing-fields.js down
 */

import '../env-loader.js';        // loads api/.env before anything else
import { db } from '../shared/db.js';

async function up() {
  console.log('[Migration] Running add-global-billing-fields…');

  await db.query(`
    ALTER TABLE user_personal_info
      ADD COLUMN IF NOT EXISTS country_code           VARCHAR(2),
      ADD COLUMN IF NOT EXISTS subscription_currency  VARCHAR(3);
  `);

  // Index to allow quick currency-group queries (e.g. analytics)
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_country_code
      ON user_personal_info(country_code)
      WHERE country_code IS NOT NULL;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_subscription_currency
      ON user_personal_info(subscription_currency)
      WHERE subscription_currency IS NOT NULL;
  `);

  console.log('[Migration] add-global-billing-fields complete ✓');
}

async function down() {
  console.log('[Migration] Rolling back add-global-billing-fields…');

  await db.query(`
    DROP INDEX IF EXISTS idx_user_country_code;
    DROP INDEX IF EXISTS idx_user_subscription_currency;
  `);

  await db.query(`
    ALTER TABLE user_personal_info
      DROP COLUMN IF EXISTS country_code,
      DROP COLUMN IF EXISTS subscription_currency;
  `);

  console.log('[Migration] Rollback complete ✓');
}

const command = process.argv[2];
if (command === 'down') {
  down().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
} else {
  up().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
