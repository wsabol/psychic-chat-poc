/**
 * Migration: Remove billing address columns from user_personal_info
 *
 * Billing address (country, state, city, postal code, address line 1) is no
 * longer stored in the application database. The data is passed directly to
 * Stripe at the time a payment method is saved, and Stripe is the sole
 * owner of that information going forward.
 *
 * Columns removed:
 *   - billing_country_encrypted
 *   - billing_state_encrypted
 *   - billing_city_encrypted
 *   - billing_postal_code_encrypted
 *   - billing_address_line1_encrypted
 *
 * Run: node api/migrations/remove-billing-address-columns.js
 */

import { db } from '../shared/db.js';

async function up() {

  await db.query(`
    ALTER TABLE user_personal_info
      DROP COLUMN IF EXISTS billing_country_encrypted,
      DROP COLUMN IF EXISTS billing_state_encrypted,
      DROP COLUMN IF EXISTS billing_city_encrypted,
      DROP COLUMN IF EXISTS billing_postal_code_encrypted,
      DROP COLUMN IF EXISTS billing_address_line1_encrypted;
  `);
}

up()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
