/**
 * Migration: add-ua-to-admin-trusted-ips
 *
 * Adds user_agent_encrypted and user_agent_hash columns to admin_trusted_ips
 * so ALL users (not just admins) can have per-device trust entries keyed by
 * User-Agent rather than IP address.
 *
 * This fixes:
 *   1. Mobile "This device not trusted" bug (IPs change on mobile, UA is stable)
 *   2. Per-user device trust – each family member gets their own row per device
 *
 * Run with: node api/migrations/add-ua-to-admin-trusted-ips.js
 */

import { db } from '../shared/db.js';

async function up() {
  console.log('Running migration: add-ua-to-admin-trusted-ips');

  // 1. Add the two new columns (idempotent)
  await db.query(`
    ALTER TABLE admin_trusted_ips
      ADD COLUMN IF NOT EXISTS user_agent_encrypted BYTEA,
      ADD COLUMN IF NOT EXISTS user_agent_hash      VARCHAR(64)
  `);
  console.log('  ✓ Columns added (user_agent_encrypted, user_agent_hash)');

  // 2. Unique partial index on (user_id_hash, user_agent_hash) for UA-keyed rows.
  //    Partial so that old IP-only rows (user_agent_hash IS NULL) are unaffected.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_trusted_ips_ua_unique
      ON admin_trusted_ips (user_id_hash, user_agent_hash)
      WHERE user_agent_hash IS NOT NULL
  `);
  console.log('  ✓ Unique index created (user_id_hash, user_agent_hash) WHERE NOT NULL');

  // 3. Plain index for fast lookups
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_trusted_ips_ua_hash
      ON admin_trusted_ips (user_id_hash, user_agent_hash)
  `);
  console.log('  ✓ Lookup index created');

  console.log('Migration complete.');
}

up().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}).finally(() => db.end?.());
