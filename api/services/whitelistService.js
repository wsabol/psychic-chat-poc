/**
 * Whitelist Service
 * Business logic for managing free trial whitelist
 */

import { db } from '../shared/db.js';
import { hashIpAddress, hashUserId } from '../shared/hashUtils.js';
import { ENCRYPTION_KEY } from '../shared/encryptionUtils.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * Get all active whitelisted IP addresses
 * @returns {Promise<Object>} Result with whitelist array
 */
export async function getAllWhitelistedIps() {
  try {
    const { rows } = await db.query(
      `SELECT id, ip_address_hash, device_name, browser_info, user_id_hash, 
              is_active, added_at, last_used_at 
       FROM free_trial_whitelist 
       WHERE is_active = TRUE AND removed_at IS NULL
       ORDER BY added_at DESC`
    );

    return {
      success: true,
      whitelist: rows,
      count: rows.length
    };
  } catch (err) {
    logErrorFromCatch(err, 'whitelist-service', 'Error fetching whitelist');
    return {
      success: false,
      error: 'Failed to fetch whitelist',
      code: 'FETCH_ERROR'
    };
  }
}

/**
 * Check if IP address is whitelisted
 * @param {string} ipAddress - IP address to check
 * @returns {Promise<boolean>} True if whitelisted
 */
export async function isIpWhitelisted(ipAddress) {
  try {
    const ipHash = hashIpAddress(ipAddress);
    
    const { rows } = await db.query(
      `SELECT id FROM free_trial_whitelist 
       WHERE ip_address_hash = $1 AND is_active = TRUE AND removed_at IS NULL`,
      [ipHash]
    );

    return rows.length > 0;
  } catch (err) {
    logErrorFromCatch(err, 'whitelist-service', 'Error checking whitelist');
    return false; // Default to not whitelisted on error
  }
}

/**
 * Add IP address to whitelist
 * @param {Object} params - Parameters
 * @param {string} params.ipAddress - IP address to whitelist
 * @param {string} params.deviceName - Device name/description
 * @param {string} params.browserInfo - Browser user agent
 * @param {string} params.userId - User ID of admin adding entry
 * @returns {Promise<Object>} Result with whitelisted entry
 */
export async function addIpToWhitelist({ ipAddress, deviceName, browserInfo, userId }) {
  try {
    const ipHash = hashIpAddress(ipAddress);
    const userIdHash = hashUserId(userId);

    // Check if already whitelisted (active entries only)
    const existing = await db.query(
      `SELECT id FROM free_trial_whitelist 
       WHERE ip_address_hash = $1 AND is_active = TRUE AND removed_at IS NULL`,
      [ipHash]
    );

    if (existing.rows.length > 0) {
      return {
        success: false,
        error: 'IP address already whitelisted',
        code: 'ALREADY_WHITELISTED'
      };
    }

    // Add to whitelist with encryption
    const result = await db.query(
      `INSERT INTO free_trial_whitelist 
       (ip_address_hash, ip_address_encrypted, device_name, browser_info, 
        user_id_hash, is_active, added_at, last_used_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, TRUE, NOW(), NOW())
       RETURNING id, ip_address_hash, device_name, browser_info, user_id_hash, 
                 is_active, added_at, last_used_at`,
      [ipHash, ipAddress, ENCRYPTION_KEY, deviceName, browserInfo, userIdHash]
    );

    return {
      success: true,
      whitelist: result.rows[0]
    };
  } catch (err) {
    logErrorFromCatch(err, 'whitelist-service', 'Error adding to whitelist');
    return {
      success: false,
      error: 'Failed to add to whitelist',
      code: 'ADD_ERROR'
    };
  }
}

/**
 * Remove IP address from whitelist (soft delete)
 * @param {string} whitelistId - Whitelist entry ID
 * @returns {Promise<Object>} Result with removed entry
 */
export async function removeIpFromWhitelist(whitelistId) {
  try {
    // Soft delete: set is_active = FALSE and removed_at = NOW()
    const result = await db.query(
      `UPDATE free_trial_whitelist 
       SET is_active = FALSE, removed_at = NOW() 
       WHERE id = $1 AND is_active = TRUE 
       RETURNING id, ip_address_hash`,
      [whitelistId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Whitelist entry not found or already removed',
        code: 'NOT_FOUND'
      };
    }

    return {
      success: true,
      removed: result.rows[0]
    };
  } catch (err) {
    logErrorFromCatch(err, 'whitelist-service', 'Error removing from whitelist');
    return {
      success: false,
      error: 'Failed to remove from whitelist',
      code: 'REMOVE_ERROR'
    };
  }
}

/**
 * Get whitelist status for specific IP
 * @param {string} ipAddress - IP address to check
 * @returns {Promise<Object>} Whitelist status
 */
export async function getWhitelistStatus(ipAddress) {
  try {
    const ipHash = hashIpAddress(ipAddress);

    const { rows } = await db.query(
      `SELECT id, device_name, added_at, last_used_at 
       FROM free_trial_whitelist 
       WHERE ip_address_hash = $1 AND is_active = TRUE AND removed_at IS NULL`,
      [ipHash]
    );

    return {
      success: true,
      ipAddress,
      ipHash,
      isWhitelisted: rows.length > 0,
      entry: rows.length > 0 ? rows[0] : null
    };
  } catch (err) {
    logErrorFromCatch(err, 'whitelist-service', 'Error getting whitelist status');
    return {
      success: false,
      error: 'Failed to get whitelist status',
      code: 'STATUS_ERROR'
    };
  }
}

export default {
  getAllWhitelistedIps,
  isIpWhitelisted,
  addIpToWhitelist,
  removeIpFromWhitelist,
  getWhitelistStatus
};
