/**
 * Admin Device Trust Service  (UA-keyed, all users)
 *
 * Manages the User-Agent-hash-keyed trusted-device rows in admin_trusted_ips.
 * This is the mechanism used by the settings-page "This Device" badge and the
 * 2FA bypass check for ALL users (admin and regular alike).
 *
 * ─── Why UA hashing, not IP matching? ───────────────────────────────────────
 * IP addresses change constantly on mobile networks.  A SHA-256 hash of the
 * User-Agent string (or the app's persistent X-Device-ID UUID) is stable
 * across sessions on the same device, making it a reliable trust key.
 *
 * • Mobile apps  → send a persistent UUID in the X-Device-ID header
 *   (User-Agent is a forbidden XHR header in React Native and cannot be set).
 * • Web browsers → use the User-Agent header automatically.
 *
 * The current IP is stored alongside each row for audit purposes but is NOT
 * used for identity matching.
 *
 * ─── Relationship to adminIpTrustService ────────────────────────────────────
 * Both services share the admin_trusted_ips table.  Rows differ in which
 * lookup key is populated:
 *   • IP-trust rows  (adminIpTrustService)  → ip_address_encrypted, no user_agent_hash
 *   • UA-trust rows  (this service)         → user_agent_hash, ip stored for audit only
 *
 * The admin login-bypass check (check.js → check-2fa route) continues to use
 * IP matching for admin accounts; that logic lives in adminIpTrustService.
 * ────────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';
import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * SHA-256 hash of a User-Agent / X-Device-ID string.
 * Used as the lookup key so we never need to decrypt to find a matching row.
 *
 * @param {string|null} userAgent
 * @returns {string|null}
 */
function hashUA(userAgent) {
  if (!userAgent) return null;
  return crypto.createHash('sha256').update(userAgent.trim()).digest('hex');
}

// ─── Device trust queries ─────────────────────────────────────────────────────

/**
 * Return the trusted-device row for `(userId, userAgent)`, or null.
 *
 * The `userAgent` parameter accepts both a literal User-Agent string and the
 * mobile app's persistent X-Device-ID UUID — both are hashed the same way.
 *
 * Used by:
 *   • checkCurrentDeviceTrustHandler  (settings page badge)
 *   • check2FAHandler regular-user path  (login bypass)
 *
 * @param {string} userId
 * @param {string} userAgent  User-Agent string or X-Device-ID UUID
 * @returns {Promise<{id: number, first_seen: Date, device_name: string}|null>}
 */
export async function checkTrustedDevice(userId, userAgent) {
  try {
    const userIdHash = hashUserId(userId);
    const uaHash = hashUA(userAgent);
    if (!uaHash) return null;

    const result = await db.query(
      `SELECT id, first_seen, device_name
         FROM admin_trusted_ips
        WHERE user_id_hash    = $1
          AND user_agent_hash = $2
          AND is_trusted      = TRUE`,
      [userIdHash, uaHash]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'checkTrustedDevice');
    return null;
  }
}

/**
 * Upsert a UA-keyed trusted-device row.
 *
 * • If a row already exists for `(userId, userAgent)` → update last_accessed,
 *   refresh the stored IP (audit trail), and re-set is_trusted = TRUE.
 * • Otherwise → insert a new row.
 *
 * Throws if `userAgent` is empty/null (callers should guard before calling).
 *
 * Used by trustCurrentDeviceHandler for ALL users.
 *
 * @param {string} userId
 * @param {string} userAgent     User-Agent string or X-Device-ID UUID
 * @param {string} ipAddress     Current IP — stored for audit, not for matching
 * @param {string} deviceName    Human-readable label shown in the settings UI
 * @returns {Promise<{id: number}>}
 */
export async function recordTrustedDevice(userId, userAgent, ipAddress, deviceName) {
  const userIdHash = hashUserId(userId);
  const uaHash = hashUA(userAgent);
  if (!uaHash) throw new Error('recordTrustedDevice: empty userAgent');

  const ip = (ipAddress || 'unknown').trim() || 'unknown';

  const updateResult = await db.query(
    `UPDATE admin_trusted_ips
        SET last_accessed        = NOW(),
            device_name          = $2,
            ip_address_encrypted = pgp_sym_encrypt($3, $4),
            is_trusted           = TRUE
      WHERE user_id_hash    = $1
        AND user_agent_hash = $5
      RETURNING id`,
    [userIdHash, deviceName, ip, ENCRYPTION_KEY, uaHash]
  );

  if (updateResult.rows.length > 0) return updateResult.rows[0];

  const insertResult = await db.query(
    `INSERT INTO admin_trusted_ips
       (user_id_hash, ip_address_encrypted, user_agent_encrypted,
        user_agent_hash, device_name, is_trusted, last_accessed, created_at)
     VALUES
       ($1, pgp_sym_encrypt($2, $3), pgp_sym_encrypt($4, $3),
        $5, $6, TRUE, NOW(), NOW())
     RETURNING id`,
    [userIdHash, ip, ENCRYPTION_KEY, userAgent, uaHash, deviceName]
  );

  return insertResult.rows[0];
}

/**
 * Soft-revoke the UA-keyed row (sets is_trusted = FALSE).
 *
 * Keeps the row in the database so the UI can show it in red ("Not trusted")
 * and the user can re-trust without triggering a new INSERT.
 *
 * Used by revokeCurrentDeviceTrustHandler for ALL users.
 *
 * @param {string} userId
 * @param {string} userAgent  User-Agent string or X-Device-ID UUID
 * @returns {Promise<boolean>}  true if a row was updated
 */
export async function setTrustedDeviceInactiveByUA(userId, userAgent) {
  try {
    const userIdHash = hashUserId(userId);
    const uaHash = hashUA(userAgent);
    if (!uaHash) return false;

    const result = await db.query(
      `UPDATE admin_trusted_ips
          SET is_trusted    = FALSE,
              last_accessed = NOW()
        WHERE user_id_hash    = $1
          AND user_agent_hash = $2
        RETURNING id`,
      [userIdHash, uaHash]
    );

    return result.rows.length > 0;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'setTrustedDeviceInactiveByUA');
    return false;
  }
}
