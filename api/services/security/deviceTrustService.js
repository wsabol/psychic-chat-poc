import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { extractDeviceName } from '../../shared/deviceFingerprint.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { SECURITY_CONFIG } from '../../config/security.js';

/**
 * Device Trust Service
 * Manages trusted devices for 2FA bypass
 */

/**
 * Check if the current device is trusted
 * @param {string} userId - User ID
 * @param {string} userAgent - Browser user agent string
 * @param {string} ipAddress - IP address (optional, not used for matching due to mobile IP changes)
 * @returns {Promise<Object>} Result with isTrusted boolean and session data
 */
export async function checkDeviceTrust(userId, userAgent, ipAddress = null) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    const result = await db.query(
      `SELECT id, trust_expiry, is_trusted,
              pgp_sym_decrypt(ip_address_encrypted, $1) as stored_ip,
              pgp_sym_decrypt(user_agent_encrypted, $1) as stored_ua
       FROM security_sessions 
       WHERE user_id_hash = $2`,
      [ENCRYPTION_KEY, userIdHash]
    );

    if (result.rows.length === 0) {
      return { isTrusted: false, session: null };
    }

    const session = result.rows[0];

    // Check if device is trusted and not expired
    if (session.is_trusted && session.trust_expiry && new Date(session.trust_expiry) > new Date()) {
      // Only check user-agent, not IP (IP changes frequently on mobile)
      if (session.stored_ua === userAgent) {
        return { isTrusted: true, session };
      }
    }

    return { isTrusted: false, session };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'deviceTrustService.checkDeviceTrust');
    return { isTrusted: false, session: null, error: error.message };
  }
}

/**
 * Trust a device for the specified duration
 * @param {string} userId - User ID
 * @param {Object} deviceInfo - Device information (userAgent, ipAddress, deviceName)
 * @param {number} durationDays - How many days to trust the device
 * @returns {Promise<Object>} Result with success status
 */
export async function trustDevice(userId, deviceInfo, durationDays = SECURITY_CONFIG.DEVICE_TRUST_DURATION_DAYS) {
  try {
    const { userAgent, ipAddress, deviceName: providedDeviceName } = deviceInfo;
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const deviceName = providedDeviceName || extractDeviceName(userAgent);

    // UPSERT pattern: Update if exists, insert if not
    const updateResult = await db.query(
      `UPDATE security_sessions 
       SET device_name_encrypted = pgp_sym_encrypt($2, $3),
           ip_address_encrypted = pgp_sym_encrypt($4, $3),
           user_agent_encrypted = pgp_sym_encrypt($5, $3),
           is_trusted = true,
           trust_expiry = NOW() + INTERVAL '${durationDays} days',
           last_active = NOW()
       WHERE user_id_hash = $1
       RETURNING id`,
      [userIdHash, deviceName, ENCRYPTION_KEY, ipAddress, userAgent]
    );

    // If no row was updated, insert new one
    if (updateResult.rows.length === 0) {
      await db.query(
        `INSERT INTO security_sessions (
          user_id_hash, 
          device_name_encrypted, 
          ip_address_encrypted, 
          user_agent_encrypted, 
          is_trusted, 
          trust_expiry, 
          last_active, 
          created_at
        )
        VALUES (
          $1, 
          pgp_sym_encrypt($2, $3), 
          pgp_sym_encrypt($4, $3), 
          pgp_sym_encrypt($5, $3), 
          true, 
          NOW() + INTERVAL '${durationDays} days', 
          NOW(), 
          NOW()
        )`,
        [userIdHash, deviceName, ENCRYPTION_KEY, ipAddress, userAgent]
      );
    }

    return { success: true, deviceName };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'deviceTrustService.trustDevice');
    return { success: false, error: error.message };
  }
}

/**
 * Revoke trust for a specific device
 * @param {string} userId - User ID
 * @param {number} deviceId - Device session ID (null to revoke current device)
 * @returns {Promise<Object>} Result with success status
 */
export async function revokeDeviceTrust(userId, deviceId = null) {
  try {
    const userIdHash = hashUserId(userId);

    let result;
    if (deviceId) {
      // Revoke specific device
      result = await db.query(
        `UPDATE security_sessions 
         SET is_trusted = false, trust_expiry = NULL
         WHERE id = $1 
         AND user_id_hash = $2
         RETURNING id`,
        [deviceId, userIdHash]
      );
    } else {
      // Revoke current device (all sessions for user)
      result = await db.query(
        `UPDATE security_sessions 
         SET is_trusted = false, trust_expiry = NULL
         WHERE user_id_hash = $1
         RETURNING id`,
        [userIdHash]
      );
    }

    if (result.rows.length === 0) {
      return { success: false, error: 'Device session not found' };
    }

    return { success: true, revokedCount: result.rows.length };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'deviceTrustService.revokeDeviceTrust');
    return { success: false, error: error.message };
  }
}

/**
 * Get all trusted devices for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result with array of trusted devices
 */
export async function getTrustedDevices(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    const result = await db.query(
      `SELECT 
        id,
        pgp_sym_decrypt(device_name_encrypted, $1) as device_name,
        created_at,
        last_active,
        trust_expiry
       FROM security_sessions 
       WHERE user_id_hash = $2 
       AND is_trusted = true
       AND trust_expiry > NOW()
       ORDER BY last_active DESC`,
      [ENCRYPTION_KEY, userIdHash]
    );

    return { success: true, devices: result.rows };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'deviceTrustService.getTrustedDevices');
    return { success: false, devices: [], error: error.message };
  }
}

/**
 * Check if a specific device is trusted (by user agent)
 * @param {string} userId - User ID
 * @param {string} userAgent - Browser user agent string
 * @returns {Promise<boolean>} True if device is trusted
 */
export async function isDeviceTrusted(userId, userAgent) {
  try {
    const result = await checkDeviceTrust(userId, userAgent);
    return result.isTrusted;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'deviceTrustService.isDeviceTrusted');
    return false;
  }
}

/**
 * Update last active timestamp for a device session
 * @param {string} userId - User ID
 * @param {string} userAgent - Browser user agent string
 * @returns {Promise<Object>} Result with success status
 */
export async function updateDeviceActivity(userId, userAgent) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    // Update last_active for matching session
    const result = await db.query(
      `UPDATE security_sessions 
       SET last_active = NOW()
       WHERE user_id_hash = $1
       AND pgp_sym_decrypt(user_agent_encrypted, $2) = $3
       RETURNING id`,
      [userIdHash, ENCRYPTION_KEY, userAgent]
    );

    return { success: true, updated: result.rows.length > 0 };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'deviceTrustService.updateDeviceActivity');
    return { success: false, error: error.message };
  }
}

/**
 * Clean up expired device trust entries (for scheduled jobs)
 * @returns {Promise<Object>} Result with count of cleaned up entries
 */
export async function cleanupExpiredDeviceTrust() {
  try {
    const result = await db.query(
      `UPDATE security_sessions 
       SET is_trusted = false, trust_expiry = NULL
       WHERE is_trusted = true 
       AND trust_expiry < NOW()
       RETURNING id`
    );

    return { success: true, cleanedCount: result.rows.length };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'deviceTrustService.cleanupExpiredDeviceTrust');
    return { success: false, error: error.message };
  }
}
