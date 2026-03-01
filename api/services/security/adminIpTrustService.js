/**
 * Admin IP Trust Service
 *
 * Manages the IP-address-based trusted-device list that gates the admin
 * login-bypass flow.  When an admin logs in from a known IP, 2FA is skipped.
 * When the IP is new, an alert + 2FA code email is sent and the IP is held
 * in a "pending" state until the admin verifies.
 *
 * All records live in the `admin_trusted_ips` table and are keyed by the
 * SHA-256 hash of the userId.  IP addresses are stored encrypted via
 * pgp_sym_encrypt so we decrypt at query time for comparison (encrypted
 * values are not deterministic and cannot be compared directly).
 *
 * ─── NOTE on IP normalisation ───────────────────────────────────────────────
 * normalizeIP() mirrors the transformations applied by extractIpAddress() in
 * sessionManager/utils/deviceParser.js so that IPs stored via recordTrustedIP
 * (which calls parseDeviceInfo) always compare equal to IPs passed in from
 * req.ip in other handlers.
 *
 * It intentionally differs from extractClientIp() in shared/ipUtils.js in one
 * subtle way: IPv6 loopback (::1) is normalised to "localhost" here, because
 * that is what parseDeviceInfo/extractIpAddress returns.  extractClientIp
 * returns "127.0.0.1" instead.  Do NOT silently merge these two helpers
 * without auditing rows already stored in the database.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { db } from '../../shared/db.js';
import { send2FACodeEmail } from '../../shared/emailService.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * Normalise an IP address for consistent storage and comparison.
 *
 * Transformations (in order):
 *   1. Trim whitespace
 *   2. Strip IPv4-mapped IPv6 prefix  e.g. "::ffff:203.0.113.5" → "203.0.113.5"
 *   3. Convert IPv6 loopback          "::1" → "localhost"
 *   4. Lowercase
 *
 * @param {string|null} ip
 * @returns {string|null}
 */
function normalizeIP(ip) {
  if (!ip) return ip;
  let normalized = ip.trim();

  const ipv4Mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
  const match = normalized.match(ipv4Mapped);
  if (match) normalized = match[1];

  if (normalized === '::1') normalized = 'localhost';

  return normalized.toLowerCase();
}

// ─── IP trust CRUD ───────────────────────────────────────────────────────────

/**
 * Returns the matching trusted-IP row for `userId` + `ipAddress`, or null.
 *
 * @param {string} userId
 * @param {string} ipAddress  Raw IP from req / parseDeviceInfo
 * @returns {Promise<{id: number, first_seen: Date, device_name: string}|null>}
 */
export async function checkTrustedIP(userId, ipAddress) {
  try {
    const userIdHash = hashUserId(userId);
    const ip = normalizeIP(ipAddress);

    const result = await db.query(
      `SELECT id, first_seen, device_name
         FROM admin_trusted_ips
        WHERE user_id_hash = $1
          AND pgp_sym_decrypt(ip_address_encrypted, $2) = $3
          AND is_trusted = TRUE`,
      [userIdHash, ENCRYPTION_KEY, ip]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'checkTrustedIP');
    return null;
  }
}

/**
 * Upsert an IP-based trusted-device record.
 *
 * • If a row already exists for this (user, IP) → update last_accessed and
 *   re-mark as trusted.
 * • Otherwise → insert a new row with is_trusted = TRUE.
 *
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} deviceName
 * @param {string} browserInfo
 * @returns {Promise<{id: number, first_seen: Date}|null>}
 */
export async function recordTrustedIP(userId, ipAddress, deviceName, browserInfo) {
  try {
    const userIdHash = hashUserId(userId);
    const ip = normalizeIP(ipAddress);

    const updateResult = await db.query(
      `UPDATE admin_trusted_ips
          SET last_accessed = NOW(),
              device_name   = $2,
              browser_info  = $3,
              is_trusted    = TRUE
        WHERE user_id_hash = $1
          AND pgp_sym_decrypt(ip_address_encrypted, $4) = $5
        RETURNING id, first_seen`,
      [userIdHash, deviceName, browserInfo, ENCRYPTION_KEY, ip]
    );

    if (updateResult.rows.length > 0) return updateResult.rows[0];

    const insertResult = await db.query(
      `INSERT INTO admin_trusted_ips
         (user_id_hash, ip_address_encrypted, device_name, browser_info,
          is_trusted, last_accessed, created_at)
       VALUES
         ($1, pgp_sym_encrypt($2, $3), $4, $5, TRUE, NOW(), NOW())
       RETURNING id, first_seen`,
      [userIdHash, ip, ENCRYPTION_KEY, deviceName, browserInfo]
    );

    return insertResult.rows[0];
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'recordTrustedIP');
    return null;
  }
}

/**
 * Soft-revoke an IP record (sets is_trusted = FALSE).
 * Keeps the row so the UI can show "Not trusted" and allow re-trusting
 * without inserting a duplicate row.
 *
 * Used by the "Remove Trust" flow in security settings.
 *
 * @param {string} userId
 * @param {string} ipAddress
 * @returns {Promise<boolean>}  true if a row was updated
 */
export async function setTrustedIPInactiveByAddress(userId, ipAddress) {
  try {
    const userIdHash = hashUserId(userId);
    const ip = normalizeIP(ipAddress);

    const result = await db.query(
      `UPDATE admin_trusted_ips
          SET is_trusted    = FALSE,
              last_accessed = NOW()
        WHERE user_id_hash = $1
          AND pgp_sym_decrypt(ip_address_encrypted, $2) = $3
        RETURNING id`,
      [userIdHash, ENCRYPTION_KEY, ip]
    );

    return result.rows.length > 0;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'setTrustedIPInactiveByAddress');
    return false;
  }
}

/**
 * Hard-delete an IP record by IP address.
 * Used by the "revoke current device" flow where we know the IP but not the
 * row id.
 *
 * @param {string} userId
 * @param {string} ipAddress
 * @returns {Promise<boolean>}  true if a row was deleted
 */
export async function revokeTrustedIPByAddress(userId, ipAddress) {
  try {
    const userIdHash = hashUserId(userId);
    const ip = normalizeIP(ipAddress);

    const result = await db.query(
      `DELETE FROM admin_trusted_ips
        WHERE user_id_hash = $1
          AND pgp_sym_decrypt(ip_address_encrypted, $2) = $3
        RETURNING id`,
      [userIdHash, ENCRYPTION_KEY, ip]
    );

    return result.rows.length > 0;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'revokeTrustedIPByAddress');
    return false;
  }
}

/**
 * Hard-delete an IP record by its row ID.
 * Used by the "Revoke" button in the Trusted Devices table.
 * Ownership is enforced by matching user_id_hash so users cannot delete
 * other users' records.
 *
 * @param {string} userId
 * @param {number|string} ipId  Row ID
 * @returns {Promise<boolean>}  true if a row was deleted
 */
export async function revokeTrustedIP(userId, ipId) {
  try {
    const userIdHash = hashUserId(userId);

    const result = await db.query(
      `DELETE FROM admin_trusted_ips
        WHERE id = $1 AND user_id_hash = $2
        RETURNING id`,
      [ipId, userIdHash]
    );

    return result.rows.length > 0;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'revokeTrustedIP');
    return false;
  }
}

/**
 * Return ALL IP records for `userId` (trusted and untrusted), newest first.
 * The `is_trusted` flag lets the UI show the correct status badge for each row.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getTrustedIPs(userId) {
  try {
    const userIdHash = hashUserId(userId);

    const result = await db.query(
      `SELECT id,
              device_name,
              browser_info,
              first_seen,
              last_accessed,
              created_at,
              is_trusted,
              user_agent_hash
         FROM admin_trusted_ips
        WHERE user_id_hash = $1
        ORDER BY last_accessed DESC`,
      [userIdHash]
    );

    return result.rows;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'getTrustedIPs');
    return [];
  }
}

// ─── Audit logging ────────────────────────────────────────────────────────────

/**
 * Append a row to admin_login_attempts for audit purposes.
 *
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} deviceName
 * @param {string} status       e.g. 'success' | 'new_ip_detected' | 'alert_sent' | '2fa_passed'
 * @param {boolean} [alertSent=false]
 */
export async function logAdminLoginAttempt(
  userId,
  ipAddress,
  deviceName,
  status,
  alertSent = false
) {
  try {
    const userIdHash = hashUserId(userId);
    await db.query(
      `INSERT INTO admin_login_attempts
         (user_id_hash, ip_address_encrypted, device_name, login_status, alert_sent, attempted_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, NOW())`,
      [userIdHash, ipAddress, ENCRYPTION_KEY, deviceName, status, alertSent]
    );
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'logAdminLoginAttempt');
  }
}

// ─── Email alerting ───────────────────────────────────────────────────────────

/**
 * Send an alert email to `adminEmail` when a login is detected from a new IP.
 *
 * @deprecated  check.js now builds the combined alert+2FA email itself using
 *              buildAdminNewIPEmailHTML() from adminEmailBuilder.js.  This
 *              function is retained here in case it is needed for a standalone
 *              alert (i.e. without a 2FA code), but it is not called by any
 *              current route handler.
 *
 * @param {string} adminEmail
 * @param {string} ipAddress
 * @param {string} deviceName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendNewIPAlert(adminEmail, ipAddress, deviceName) {
  try {
    let location = 'Unknown Location';
    try {
      const geo = await fetch(`https://ipapi.co/${ipAddress}/json/`)
        .then(r => r.json())
        .catch(() => ({}));
      location = `${geo.city || 'Unknown'}, ${geo.country_name || 'Unknown'}`;
    } catch {
      // Use default location if geo-lookup fails
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #e74c3c;">🔐 New Login Location Detected</h2>

          <p>Someone attempted to log into your admin account from a new location:</p>

          <table style="border: 1px solid #ddd; width: 100%; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; font-weight: bold;">IP Address:</td>
              <td style="padding: 10px; font-family: monospace;">${ipAddress}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Location:</td>
              <td style="padding: 10px;">${location}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; font-weight: bold;">Device:</td>
              <td style="padding: 10px;">${deviceName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Time:</td>
              <td style="padding: 10px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>

          <div style="background-color: #e8f4f8; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
            <strong>✅ What we did:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Blocked the login from this new location</li>
              <li>Required additional 2FA verification</li>
              <li>Your account remains secure</li>
            </ul>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #f39c12; margin: 20px 0;">
            <strong>What you should do:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>If this was YOU: Complete the 2FA verification to trust this device</li>
              <li>If this was NOT you: Change your password immediately</li>
            </ul>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This alert was sent to ${adminEmail}.
            If you receive unexpected alerts, your account may be compromised.
          </p>
        </div>
      </div>
    `;

    const sendResult = await send2FACodeEmail(adminEmail, html);

    if (sendResult.success) {
      await logAdminLoginAttempt('admin_alert', ipAddress, deviceName, 'alert_sent');
    }

    return sendResult;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'sendNewIPAlert');
    return { success: false, error: err.message };
  }
}
