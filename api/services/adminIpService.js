import crypto from 'crypto';
import { db } from '../shared/db.js';
import { send2FACodeEmail } from '../shared/emailService.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { hashUserId } from '../shared/hashUtils.js';

const ADMIN_EMAILS = ['starshiptechnology1@gmail.com', 'wsabol39@gmail.com'];
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Normalise an IP address for consistent storage and comparison.
 *
 * This mirrors the logic in extractIpAddress() (sessionManager/utils/deviceParser.js)
 * so that IPs stored by trustAdminDeviceHandler (which uses parseDeviceInfo) always
 * compare equal to IPs passed in from req.ip in the other handlers.
 *
 * Transformations applied (in order):
 *   1. Trim whitespace
 *   2. Strip IPv4-mapped IPv6 prefix  →  "::ffff:203.0.113.5" → "203.0.113.5"
 *   3. Convert IPv6 loopback          →  "::1" → "localhost"
 *   4. Lowercase
 */
function normalizeIP(ip) {
  if (!ip) return ip;
  let normalized = ip.trim();
  // Strip IPv4-mapped IPv6 prefix
  const ipv4Mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
  const match = normalized.match(ipv4Mapped);
  if (match) normalized = match[1];
  // Normalize IPv6 loopback to localhost (matches extractIpAddress behaviour)
  if (normalized === '::1') normalized = 'localhost';
  return normalized.toLowerCase();
}

/**
 * Check if an email is registered as an admin
 */
export async function isAdmin(userEmail) {
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
}

/**
 * Check if an IP is trusted for a given admin user
 */
export async function checkTrustedIP(userId, ipAddress) {
  try {
    const userIdHash = hashUserId(userId);
    const ip = normalizeIP(ipAddress);
    // Decrypt stored IPs and compare with plaintext to find match
    // (Can't compare encrypted values directly since each encryption is different)
    const result = await db.query(
      `SELECT id, first_seen, device_name FROM admin_trusted_ips 
       WHERE user_id_hash = $1 
         AND pgp_sym_decrypt(ip_address_encrypted, $2) = $3
         AND is_trusted = TRUE`,
      [userIdHash, ENCRYPTION_KEY, ip]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'check trusted IP');
    return null;
  }
}

/**
 * Record a trusted IP for an admin user
 */
export async function recordTrustedIP(userId, ipAddress, deviceName, browserInfo) {
  try {
    const userIdHash = hashUserId(userId);
    const ip = normalizeIP(ipAddress);
    
    // Try to update existing first
    const updateResult = await db.query(
      `UPDATE admin_trusted_ips 
       SET last_accessed = NOW(), device_name = $2, browser_info = $3, is_trusted = TRUE
       WHERE user_id_hash = $1 AND pgp_sym_decrypt(ip_address_encrypted, $4) = $5
       RETURNING id, first_seen`,
      [userIdHash, deviceName, browserInfo, ENCRYPTION_KEY, ip]
    );
    
    // If already exists, return the updated record
    if (updateResult.rows.length > 0) {
      return updateResult.rows[0];
    }
    
    // If not, insert new record - set is_trusted = TRUE immediately
    const insertResult = await db.query(
      `INSERT INTO admin_trusted_ips 
       (user_id_hash, ip_address_encrypted, device_name, browser_info, is_trusted, last_accessed, created_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, TRUE, NOW(), NOW())
       RETURNING id, first_seen`,
      [userIdHash, ip, ENCRYPTION_KEY, deviceName, browserInfo]
    );
    
    return insertResult.rows[0];
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'record trusted IP');
    return null;
  }
}

/**
 * Log an admin login attempt for audit trail
 */
export async function logAdminLoginAttempt(userId, ipAddress, deviceName, status, alertSent = false) {
  try {
    const userIdHash = hashUserId(userId);
    await db.query(
      `INSERT INTO admin_login_attempts 
       (user_id_hash, ip_address_encrypted, device_name, login_status, alert_sent, attempted_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, NOW())`,
      [userIdHash, ipAddress, ENCRYPTION_KEY, deviceName, status, alertSent]
    );
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'log admin login attempt');
  }
}

/**
 * Send email alert to admin about new IP login
 */
export async function sendNewIPAlert(adminEmail, ipAddress, deviceName) {
  try {
    // Get geolocation
    let location = 'Unknown Location';
    try {
      const geo = await fetch(`https://ipapi.co/${ipAddress}/json/`)
        .then(r => r.json())
        .catch(() => ({}));
      
      location = `${geo.city || 'Unknown'}, ${geo.country_name || 'Unknown'}`;
    } catch (geoErr) {
      // Use default location if geolocation fails
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
    logErrorFromCatch(err, 'admin', 'send new IP alert');
    return { success: false, error: err.message };
  }
}

/**
 * Get ALL IP records for an admin user (both trusted and untrusted).
 * Returns is_trusted so the UI can display the correct status badge.
 */
export async function getTrustedIPs(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT 
        id,
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
    logErrorFromCatch(err, 'admin', 'get trusted IPs');
    return [];
  }
}

/**
 * Set is_trusted=false for a trusted IP record by IP address.
 * Used by the "Remove Trust" flow in security settings — keeps the row in the
 * database so it can be re-trusted later without inserting a new row.
 */
export async function setTrustedIPInactiveByAddress(userId, ipAddress) {
  try {
    const userIdHash = hashUserId(userId);
    const ip = normalizeIP(ipAddress);
    const result = await db.query(
      `UPDATE admin_trusted_ips
       SET is_trusted = FALSE, last_accessed = NOW()
       WHERE user_id_hash = $1
         AND pgp_sym_decrypt(ip_address_encrypted, $2) = $3
       RETURNING id`,
      [userIdHash, ENCRYPTION_KEY, ip]
    );
    return result.rows.length > 0;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'set trusted IP inactive by address');
    return false;
  }
}

/**
 * Revoke trust on an IP for an admin user by current IP address
 * (used by the "revoke current device" flow where we know the IP but not the row id)
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
    logErrorFromCatch(err, 'admin', 'revoke trusted IP by address');
    return false;
  }
}

/**
 * Revoke trust on an IP for an admin user (by row ID — fully deletes the row).
 * Used by the "Revoke" button in the Trusted Devices table.
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
    logErrorFromCatch(err, 'admin', 'revoke trusted IP');
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UA-based device trust (used by ALL users via security-settings device panel)
//
// Every (user × device) pair gets its own row in admin_trusted_ips, keyed by
// the SHA-256 hash of the User-Agent string.  This is stable across sessions
// on the same device/app and works correctly on mobile where IPs change.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SHA-256 hash of a User-Agent string — used as the lookup key so we never
 * need to decrypt to find a matching row.
 */
function hashUA(userAgent) {
  if (!userAgent) return null;
  return crypto.createHash('sha256').update(userAgent.trim()).digest('hex');
}

/**
 * Check whether the device identified by `userAgent` is currently trusted for
 * the given user.  Returns the matching row or null.
 *
 * Used by:
 *   • checkCurrentDeviceTrustHandler  (settings page badge)
 *   • check2FAHandler regular-user path (login bypass)
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
 * Upsert a UA-keyed trusted-device row in admin_trusted_ips.
 *
 * • If a row already exists for (user, UA) → update last_accessed + re-trust.
 * • Otherwise → insert a new row.
 *
 * The current IP is stored for audit purposes but is NOT used for matching.
 *
 * Used by trustCurrentDeviceHandler for ALL users.
 */
export async function recordTrustedDevice(userId, userAgent, ipAddress, deviceName) {
  const userIdHash = hashUserId(userId);
  const uaHash = hashUA(userAgent);
  if (!uaHash) throw new Error('recordTrustedDevice: empty userAgent');

  const ip = normalizeIP(ipAddress) || 'unknown';

  // UPDATE if an entry already exists for this (user, UA)
  const updateResult = await db.query(
    `UPDATE admin_trusted_ips
        SET last_accessed          = NOW(),
            device_name            = $2,
            ip_address_encrypted   = pgp_sym_encrypt($3, $4),
            is_trusted             = TRUE
      WHERE user_id_hash    = $1
        AND user_agent_hash = $5
      RETURNING id`,
    [userIdHash, deviceName, ip, ENCRYPTION_KEY, uaHash]
  );

  if (updateResult.rows.length > 0) {
    return updateResult.rows[0];
  }

  // INSERT a fresh row
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
 * Set is_trusted = FALSE for the UA-keyed row (keeps the row so the UI can
 * show "Not trusted" in red and the user can re-trust without a new insert).
 *
 * Used by revokeCurrentDeviceTrustHandler for ALL users.
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
