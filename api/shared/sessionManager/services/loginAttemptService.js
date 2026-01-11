/**
 * Login Attempt Service
 * Tracks login attempts with encrypted email storage
 * SECURITY: Email is encrypted before database storage using pgcrypto
 */

import { db } from '../../db.js';

/**
 * Log a login attempt
 * SECURITY: Email encrypted with AES encryption
 * @param {Object} options - Login attempt details
 */
export async function logLoginAttempt(options) {
  try {
    const {
      userId = null,
      emailAttempted,
      ipAddress,
      userAgent,
      attemptType, // 'success', 'failed_password', 'failed_2fa', 'blocked'
      reason = null
    } = options;

    // Validate required fields
    if (!emailAttempted || !attemptType) {
      return false;
    }

    // Encrypt email before storing
    await db.query(
      `INSERT INTO login_attempts (
        user_id, email_attempted_encrypted, ip_address, user_agent,
        attempt_type, reason, created_at
      ) VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, $7, NOW())`,
      [
        userId,
        emailAttempted,
        process.env.ENCRYPTION_KEY,
        ipAddress,
        userAgent,
        attemptType,
        reason
      ]
    );

    return true;

  } catch (error) {
    console.error('[LOGIN-ATTEMPT] Error logging attempt:', error);
    return false;
  }
}

/**
 * Get recent login attempts for a user
 * Note: Email is encrypted, only metadata is returned for privacy
 * @param {string} userId - User ID
 * @param {number} hours - Lookback window
 * @returns {Promise<Array>} Login attempt records (email not decrypted)
 */
export async function getLoginAttempts(userId, hours = 24) {
  try {
    const result = await db.query(
      `SELECT attempt_type, reason, ip_address, created_at, user_agent
       FROM login_attempts
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour' * $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId, hours]
    );

    return result.rows;

  } catch (error) {
    console.error('[LOGIN-ATTEMPT] Error retrieving attempts:', error);
    return [];
  }
}

/**
 * Get login attempts from a specific IP
 * @param {string} ipAddress - IP address
 * @param {number} hours - Lookback window
 * @returns {Promise<Array>} Attempts from this IP
 */
export async function getAttemptsFromIp(ipAddress, hours = 24) {
  try {
    const result = await db.query(
      `SELECT user_id, attempt_type, reason, created_at
       FROM login_attempts
       WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '1 hour' * $2
       ORDER BY created_at DESC
       LIMIT 100`,
      [ipAddress, hours]
    );

    return result.rows;

  } catch (error) {
    console.error('[LOGIN-ATTEMPT] Error getting IP attempts:', error);
    return [];
  }
}

/**
 * Count failed attempts for IP in time window
 * @param {string} ipAddress - IP address
 * @param {number} minutes - Time window in minutes
 * @returns {Promise<number>} Count of failed attempts
 */
export async function countFailedAttemptsFromIp(ipAddress, minutes = 60) {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM login_attempts
       WHERE ip_address = $1
         AND attempt_type IN ('failed_password', 'failed_2fa')
         AND created_at > NOW() - INTERVAL '1 minute' * $2`,
      [ipAddress, minutes]
    );

    return parseInt(result.rows[0].count, 10);

  } catch (error) {
    console.error('[LOGIN-ATTEMPT] Error counting failed attempts:', error);
    return 0;
  }
}

/**
 * Count unique users attempted from IP in time window
 * @param {string} ipAddress - IP address
 * @param {number} minutes - Time window in minutes
 * @returns {Promise<number>} Count of unique users
 */
export async function countUniqueUsersFromIp(ipAddress, minutes = 60) {
  try {
    const result = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM login_attempts
       WHERE ip_address = $1
         AND created_at > NOW() - INTERVAL '1 minute' * $2`,
      [ipAddress, minutes]
    );

    return parseInt(result.rows[0].count, 10);

  } catch (error) {
    console.error('[LOGIN-ATTEMPT] Error counting unique users:', error);
    return 0;
  }
}

export default {
  logLoginAttempt,
  getLoginAttempts,
  getAttemptsFromIp,
  countFailedAttemptsFromIp,
  countUniqueUsersFromIp
};

