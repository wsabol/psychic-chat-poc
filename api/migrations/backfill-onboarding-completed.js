/**
 * Migration: Backfill onboarding_completed for users who finished onboarding
 *
 * Root cause fixed:
 *   Previously, onboarding_completed was only set to TRUE when the 'welcome' step
 *   was saved (WelcomeModal dismissed).  If a user closed their browser before
 *   dismissing the modal, onboarding_completed stayed NULL/FALSE even though they
 *   had completed all required steps (including personal_info).
 *
 *   On a new device this caused isOnboarding = true, triggering the full onboarding
 *   flow again, which failed at the payment-method step because a Stripe card
 *   already existed for the customer.
 *
 * Fix applied here:
 *   Set onboarding_completed = TRUE (and onboarding_completed_at = NOW()) for any
 *   user whose onboarding_step is 'personal_info' or 'welcome' but whose
 *   onboarding_completed is still NULL or FALSE.
 *
 * Usage:
 *   node api/migrations/backfill-onboarding-completed.js
 *   (or pipe through run-migration.js if that pattern is used in this project)
 */

import '../env-loader.js'; // load .env before anything else
import { db } from '../shared/db.js';

async function runMigration() {
  console.log('[MIGRATION] backfill-onboarding-completed — starting');

  try {
    const result = await db.query(`
      UPDATE user_personal_info
      SET
        onboarding_completed     = TRUE,
        onboarding_completed_at  = COALESCE(onboarding_completed_at, NOW()),
        updated_at               = NOW()
      WHERE
        onboarding_step IN ('personal_info', 'welcome')
        AND (onboarding_completed IS NULL OR onboarding_completed = FALSE)
      RETURNING user_id, onboarding_step
    `);

    console.log(`[MIGRATION] Updated ${result.rowCount} user(s):`);
    if (result.rowCount > 0) {
      result.rows.forEach(row => {
        console.log(`  - user_id=${row.user_id}  onboarding_step=${row.onboarding_step}`);
      });
    }

    console.log('[MIGRATION] backfill-onboarding-completed — complete');
  } catch (err) {
    console.error('[MIGRATION] FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await db.end?.();
    process.exit(0);
  }
}

runMigration();
