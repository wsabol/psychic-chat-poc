/**
 * fix-onboarding-step.js
 *
 * One-time repair script for users whose onboarding_step was reset but whose
 * subscription is still active and onboarding was previously completed.
 *
 * Usage (run via SSH tunnel or from an ECS task that has DB access):
 *   node api/scripts/fix-onboarding-step.js
 *
 * The script accepts an optional USER_ID env var to target a single user.
 * Without it, it performs a dry-run showing all affected users.
 *
 *   # Dry-run (show affected rows, make no changes)
 *   node api/scripts/fix-onboarding-step.js
 *
 *   # Fix a specific user
 *   USER_ID=kKNcC3qXDoPZvrjPO02zr6qTF1P2 node api/scripts/fix-onboarding-step.js
 *
 *   # Fix ALL affected users (onboarding reset + active sub)
 *   FIX_ALL=true node api/scripts/fix-onboarding-step.js
 */

import '../env-loader.js';
import { db } from '../shared/db.js';

const TARGET_USER_ID = process.env.USER_ID;   // optional single-user fix
const FIX_ALL       = process.env.FIX_ALL === 'true';

async function main() {
  console.log('=== Onboarding Step Repair Script ===\n');

  // ── Find affected users ──────────────────────────────────────────────────────
  // "Affected" = active subscription BUT onboarding step is before 'subscription'
  // OR onboarding_completed is not true (indicating onboarding was never finished
  // even though the user clearly has an active subscription).
  const findQuery = TARGET_USER_ID
    ? `SELECT user_id, email_hash, onboarding_step, onboarding_completed,
              subscription_status, billing_platform, updated_at
       FROM user_personal_info
       WHERE user_id = $1`
    : `SELECT user_id, email_hash, onboarding_step, onboarding_completed,
              subscription_status, billing_platform, updated_at
       FROM user_personal_info
       WHERE subscription_status = 'active'
         AND (
           onboarding_completed IS NOT TRUE
           OR onboarding_step IS NULL
           OR onboarding_step NOT IN ('subscription', 'personal_info', 'welcome', 'security_settings')
         )
       ORDER BY updated_at DESC`;

  const params = TARGET_USER_ID ? [TARGET_USER_ID] : [];
  const result = await db.query(findQuery, params);

  if (result.rows.length === 0) {
    console.log('✅  No affected users found.\n');
    await db.end?.();
    return;
  }

  console.log(`Found ${result.rows.length} affected user(s):\n`);
  for (const row of result.rows) {
    console.log(
      `  user_id=${row.user_id}  onboarding_step=${row.onboarding_step ?? 'NULL'}` +
      `  onboarding_completed=${row.onboarding_completed}` +
      `  subscription_status=${row.subscription_status}` +
      `  billing_platform=${row.billing_platform ?? 'unknown'}`
    );
  }

  if (!TARGET_USER_ID && !FIX_ALL) {
    console.log('\n⚠️   DRY RUN — no changes made.');
    console.log('    Re-run with USER_ID=<id> or FIX_ALL=true to apply fixes.\n');
    await db.end?.();
    return;
  }

  // ── Apply fix ────────────────────────────────────────────────────────────────
  // Set onboarding_step to 'welcome', onboarding_completed to true.
  // The user already has an active subscription and previously completed
  // onboarding — this restores the record to the correct terminal state.
  const userIds = result.rows.map(r => r.user_id);

  const updateQuery = `
    UPDATE user_personal_info
    SET onboarding_step          = 'welcome',
        onboarding_completed     = true,
        onboarding_completed_at  = COALESCE(onboarding_completed_at, NOW()),
        updated_at               = NOW()
    WHERE user_id = ANY($1::text[])
    RETURNING user_id, onboarding_step, onboarding_completed
  `;

  const updateResult = await db.query(updateQuery, [userIds]);

  console.log(`\n✅  Fixed ${updateResult.rowCount} user(s):\n`);
  for (const row of updateResult.rows) {
    console.log(
      `  user_id=${row.user_id}  onboarding_step=${row.onboarding_step}` +
      `  onboarding_completed=${row.onboarding_completed}`
    );
  }

  await db.end?.();
  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
