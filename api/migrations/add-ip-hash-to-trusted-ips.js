/**
 * Migration: add-ip-hash-to-trusted-ips
 *
 * Adds an ip_hash column to admin_trusted_ips so IP-based trust lookups
 * can use a fast SHA-256 hash index instead of calling pgp_sym_decrypt() on
 * every row in the WHERE clause.
 *
 * Problem this fixes
 * ──────────────────
 * checkTrustedIP() runs:
 *   SELECT ... WHERE pgp_sym_decrypt(ip_address_encrypted, $key) = $ip
 *
 * PostgreSQL must decrypt EVERY row for the user to find a match — this is
 * O(n) decryptions per login.  On a local database it is fast enough to be
 * invisible.  On AWS RDS (network round-trip + shared CPU) it is noticeably
 * slower, and under load it can time out.  The catch block in checkTrustedIP
 * returns null on any error, which means the IP appears "not trusted" and
 * 2FA is required even for IPs that ARE in the trusted list.
 *
 * The fix
 * ───────
 * Store ip_hash = SHA-256(normalised_ip) alongside the encrypted IP, the
 * same pattern already used by user_agent_hash and free_trial_sessions.
 * The lookup becomes:
 *   SELECT ... WHERE user_id_hash = $1 AND ip_hash = $2
 * which uses a plain btree index and requires zero decryptions.
 *
 * Backward compatibility
 * ──────────────────────
 * Existing rows are backfilled in step 3 below.  Any row that fails
 * backfill (e.g. NULL ip_address_encrypted) is left with ip_hash = NULL
 * and a decrypt-based fallback in checkTrustedIP() handles it.
 *
 * Run with:  node api/migrations/add-ip-hash-to-trusted-ips.js
 */

import '../env-loader.js'; // Must be first so ENCRYPTION_KEY is available
import crypto from 'crypto';
import { db } from '../shared/db.js';

// ─── Helpers (must mirror adminIpTrustService.js) ────────────────────────────

function normalizeIP(ip) {
  if (!ip) return ip;
  let normalized = ip.trim();
  const ipv4Mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
  const match = normalized.match(ipv4Mapped);
  if (match) normalized = match[1];
  if (normalized === '::1') normalized = 'localhost';
  return normalized.toLowerCase();
}

function hashIP(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip.trim().toLowerCase()).digest('hex');
}

// ─── Migration ────────────────────────────────────────────────────────────────

async function up() {

  // ── 1. Add ip_hash column (idempotent) ─────────────────────────────────────
  await db.query(`
    ALTER TABLE admin_trusted_ips
      ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64)
  `);

  // ── 2. Create index for fast hash lookups ──────────────────────────────────
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_trusted_ips_ip_hash
      ON admin_trusted_ips (user_id_hash, ip_hash)
      WHERE ip_hash IS NOT NULL
  `);

  // Partial unique index — prevents duplicate IP entries per user
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_trusted_ips_ip_hash_unique
      ON admin_trusted_ips (user_id_hash, ip_hash)
      WHERE ip_hash IS NOT NULL
  `);

  // ── 3. Backfill existing rows ──────────────────────────────────────────────
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    console.warn('  ⚠  ENCRYPTION_KEY not set — skipping backfill of existing rows.');
    console.warn('     New logins will populate ip_hash going forward.');
    console.warn('     Re-run this migration with ENCRYPTION_KEY set to backfill old rows.');
    return;
  }

  // Fetch all rows that are missing ip_hash but have an encrypted IP
  const rows = await db.query(
    `SELECT id, pgp_sym_decrypt(ip_address_encrypted, $1) AS decrypted_ip
       FROM admin_trusted_ips
      WHERE ip_hash IS NULL
        AND ip_address_encrypted IS NOT NULL`,
    [ENCRYPTION_KEY]
  );

  let backfilled = 0;
  let skipped = 0;
  for (const row of rows.rows) {
    if (!row.decrypted_ip) { skipped++; continue; }
    const ip     = normalizeIP(row.decrypted_ip);
    const ipHash = hashIP(ip);
    try {
      await db.query(
        `UPDATE admin_trusted_ips SET ip_hash = $1 WHERE id = $2`,
        [ipHash, row.id]
      );
      backfilled++;
    } catch (updateErr) {
      // Unique constraint violation = another row already has this ip_hash for
      // this user — soft-delete the duplicate to keep the table clean.
      if (updateErr.code === '23505') {
        await db.query(
          `UPDATE admin_trusted_ips SET is_trusted = FALSE WHERE id = $1`,
          [row.id]
        );
        console.warn(`  ⚠  Duplicate IP row id=${row.id} — marked is_trusted=false`);
        skipped++;
      } else {
        console.error(`  ✗  Failed to backfill row id=${row.id}:`, updateErr.message);
        skipped++;
      }
    }
  }
}

up()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => db.end?.());
