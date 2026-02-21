/**
 * 2fa/helpers.js
 *
 * Shared utilities for the 2FA route module:
 *   - getUserEmail           – decrypt + fetch user email from DB
 *   - checkDeviceTrusted     – single query to decide if current UA is trusted
 *   - upsertDeviceTrust      – insert-or-update a trusted device session
 *   - generateTempToken      – create short-lived JWT for 2FA challenge flow
 *   - buildAuditFields       – fill in the repetitive fields for logAudit calls
 */

import jwt from 'jsonwebtoken';
import { db } from '../../../shared/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

/**
 * Fetch and decrypt the email address for a given userId.
 * Returns null if not found.
 */
export async function getUserEmail(userId) {
  const result = await db.query(
    `SELECT pgp_sym_decrypt(email_encrypted, $1) AS email
     FROM user_personal_info
     WHERE user_id = $2`,
    [process.env.ENCRYPTION_KEY, userId]
  );
  return result.rows[0]?.email ?? null;
}

// ---------------------------------------------------------------------------
// Device-trust helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the given user-agent matches a valid, trusted device session
 * for the user.  trust_expiry = NULL is treated as permanent trust.
 */
export async function checkDeviceTrusted(userIdHash, userAgent) {
  const result = await db.query(
    `SELECT trust_expiry, is_trusted,
            pgp_sym_decrypt(user_agent_encrypted, $1) AS stored_ua
     FROM security_sessions
     WHERE user_id_hash = $2`,
    [process.env.ENCRYPTION_KEY, userIdHash]
  );

  if (result.rows.length === 0) return false;

  const session = result.rows[0];
  const trustValid =
    !session.trust_expiry || new Date(session.trust_expiry) > new Date();

  return session.is_trusted && trustValid && session.stored_ua === userAgent;
}

/**
 * UPSERT a trusted device session (permanent, trust_expiry = NULL).
 * Safe to call on both first-trust and re-trust.
 */
export async function upsertDeviceTrust(userIdHash, deviceName, ipAddress, userAgent) {
  const key = process.env.ENCRYPTION_KEY;
  await db.query(
    `INSERT INTO security_sessions
       (user_id_hash, device_name_encrypted, ip_address_encrypted,
        user_agent_encrypted, is_trusted, trust_expiry, last_active, created_at)
     VALUES
       ($1, pgp_sym_encrypt($2, $3), pgp_sym_encrypt($4, $3),
        pgp_sym_encrypt($5, $3), true, NULL, NOW(), NOW())
     ON CONFLICT (user_id_hash) DO UPDATE SET
       device_name_encrypted = pgp_sym_encrypt($2, $3),
       ip_address_encrypted  = pgp_sym_encrypt($4, $3),
       user_agent_encrypted  = pgp_sym_encrypt($5, $3),
       is_trusted            = true,
       trust_expiry          = NULL,
       last_active           = NOW()`,
    [userIdHash, deviceName, key, ipAddress, userAgent]
  );
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/**
 * Sign a short-lived JWT for the 2FA challenge handoff.
 * @param {object} payload  – custom claims to embed
 * @param {string} expiresIn – zeit/ms string, default '10m'
 */
export function generateTempToken(payload, expiresIn = '10m') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// ---------------------------------------------------------------------------
// Audit log helpers
// ---------------------------------------------------------------------------

/**
 * Build the common fields shared by every logAudit call in this module,
 * then merge in any handler-specific overrides.
 *
 * Usage:
 *   await logAudit(db, buildAuditFields(req, {
 *     userId, action: 'USER_2FA_VERIFIED', status: 'SUCCESS',
 *     details: { deviceTrusted: true }
 *   }));
 */
export function buildAuditFields(req, overrides = {}) {
  return {
    resourceType: 'authentication',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    httpMethod: req.method,
    endpoint: req.path,
    ...overrides,
  };
}
