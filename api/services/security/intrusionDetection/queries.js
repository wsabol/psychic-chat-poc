/**
 * Database Query Helpers for Intrusion Detection
 * Handles encrypted data queries with proper decryption
 */

import { db } from '../../../shared/db.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Count failed login attempts from specific IP in time window
 */
export async function countFailedLoginsFromIP(ipAddress, windowMinutes) {
  const result = await db.query(
    `SELECT COUNT(*) as count
     FROM login_attempts
     WHERE pgp_sym_decrypt(ip_address_encrypted, $1) = $2
       AND attempt_type = $3
       AND created_at > NOW() - INTERVAL '1 minute' * $4`,
    [ENCRYPTION_KEY, ipAddress, 'failed', windowMinutes]
  );
  return parseInt(result.rows[0].count);
}

/**
 * Count distinct accounts attempted from specific IP
 */
export async function countAccountsAttemptedFromIP(ipAddress, windowMinutes) {
  const result = await db.query(
    `SELECT COUNT(DISTINCT email_attempted_encrypted) as count
     FROM login_attempts
     WHERE pgp_sym_decrypt(ip_address_encrypted, $1) = $2
       AND created_at > NOW() - INTERVAL '1 minute' * $3`,
    [ENCRYPTION_KEY, ipAddress, windowMinutes]
  );
  return parseInt(result.rows[0].count);
}

/**
 * Count requests from IP in audit log (for rate limiting detection)
 */
export async function countRequestsFromIP(ipAddress, windowMinutes) {
  const result = await db.query(
    `SELECT COUNT(*) as count
     FROM audit_log
     WHERE pgp_sym_decrypt(ip_address_encrypted, $1) = $2
       AND created_at > NOW() - INTERVAL '1 minute' * $3`,
    [ENCRYPTION_KEY, ipAddress, windowMinutes]
  );
  return parseInt(result.rows[0].count);
}

/**
 * Get failed login count for last 24 hours (all IPs)
 */
export async function getFailedLoginsLast24h() {
  const result = await db.query(
    `SELECT COUNT(*) as count
     FROM login_attempts
     WHERE attempt_type = $1
       AND created_at > NOW() - INTERVAL '24 hours'`,
    ['failed']
  );
  return parseInt(result.rows[0].count);
}

/**
 * Get suspicious IPs with failed login counts above threshold
 */
export async function getSuspiciousIPs(threshold, limit = 10) {
  const result = await db.query(
    `SELECT pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
            COUNT(*) as failed_count
     FROM login_attempts
     WHERE attempt_type = $2
       AND created_at > NOW() - INTERVAL '1 hour'
     GROUP BY ip_address_encrypted
     HAVING COUNT(*) >= $3
     ORDER BY failed_count DESC
     LIMIT $4`,
    [ENCRYPTION_KEY, 'failed', threshold, limit]
  );
  return result.rows;
}

/**
 * Get count of currently locked accounts
 */
export async function getLockedAccountsCount() {
  try {
    const result = await db.query(
      `SELECT COUNT(DISTINCT user_id_hash) as count
       FROM user_account_lockouts
       WHERE lock_expires_at > NOW()`
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    // Table might not exist or be empty
    return 0;
  }
}

/**
 * Get IPs with high account enumeration activity
 */
export async function getEnumerationAttempts(threshold, limit = 5) {
  const result = await db.query(
    `SELECT pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
            COUNT(DISTINCT email_attempted_encrypted) as unique_accounts
     FROM login_attempts
     WHERE created_at > NOW() - INTERVAL '1 hour'
     GROUP BY ip_address_encrypted
     HAVING COUNT(DISTINCT email_attempted_encrypted) >= $2
     ORDER BY unique_accounts DESC
     LIMIT $3`,
    [ENCRYPTION_KEY, threshold, limit]
  );
  return result.rows;
}

/**
 * Check if IP has had successful logins (reduces suspicion score)
 */
export async function hasSuccessfulLogin(ipAddress, daysBack = 7) {
  const result = await db.query(
    `SELECT COUNT(*) as count
     FROM login_attempts
     WHERE pgp_sym_decrypt(ip_address_encrypted, $1) = $2
       AND attempt_type = $3
       AND created_at > NOW() - INTERVAL '1 day' * $4`,
    [ENCRYPTION_KEY, ipAddress, 'success', daysBack]
  );
  return parseInt(result.rows[0].count) > 0;
}

export default {
  countFailedLoginsFromIP,
  countAccountsAttemptedFromIP,
  countRequestsFromIP,
  getFailedLoginsLast24h,
  getSuspiciousIPs,
  getLockedAccountsCount,
  getEnumerationAttempts,
  hasSuccessfulLogin
};
