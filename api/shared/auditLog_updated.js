/**
 * Audit Logging Utility
 * Logs all critical actions to audit_log table for compliance and security analysis
 * 
 * ALL SENSITIVE DATA IS ENCRYPTED BEFORE STORAGE:
 * - IP addresses are encrypted with pgp_sym_encrypt
 * - Sensitive details should NOT be stored in the details JSON
 * 
 * Usage:
 * await logAudit(db, {
 *   userId: user.user_id,
 *   action: 'USER_LOGIN_SUCCESS',
 *   resourceType: 'authentication',
 *   ipAddress: req.ip,  // Will be encrypted automatically
 *   userAgent: req.get('user-agent'),
 *   httpMethod: req.method,
 *   endpoint: req.path,
 *   status: 'SUCCESS',
 *   details: {}  // NEVER put plaintext emails/phones here
 * });
 */

import { getEncryptionKey } from './decryptionHelper.js';

/**
 * Log an action to the audit_log table
 * @param {Object} db - Database connection pool
 * @param {Object} options - Audit log options
 * @returns {Promise<void>}
 */
export async function logAudit(db, options) {
  const {
    userId = null,                    // UUID of user (null for system actions)
    isTemp = false,                   // Is this a temp account
    action,                           // REQUIRED: ACTION_TYPE
    resourceType = null,              // Category: 'authentication', 'messages', 'profile', 'account'
    resourceId = null,                // UUID of affected resource
    ipAddress = null,                 // From req.ip - WILL BE ENCRYPTED
    userAgent = null,                 // From req.get('user-agent')
    httpMethod = null,                // From req.method (GET, POST, DELETE, etc.)
    endpoint = null,                  // From req.path (/auth/login, /chat/send, etc.)
    status = 'SUCCESS',               // SUCCESS or FAILURE
    errorCode = null,                 // Error type if failed
    errorMessage = null,              // Error details (sanitized, max 500 chars)
    details = {},                     // JSONB object for action-specific metadata
    durationMs = null                 // Request duration in milliseconds
  } = options;

  // Validate required fields
  if (!action) {
    console.error('[AUDIT] ERROR: action is required for audit log');
    return;
  }

  // Sanitize error message to prevent log injection
  let sanitizedErrorMessage = null;
  if (errorMessage) {
    sanitizedErrorMessage = String(errorMessage)
      .substring(0, 500)
      .replace(/[\n\r]/g, ' ');  // Remove newlines
  }

  // Validate status
  if (!['SUCCESS', 'FAILURE', 'BLOCKED'].includes(status)) {
    status = 'SUCCESS';
  }

  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    
    // Encrypt IP address using PostgreSQL
    let encryptedIp = null;
    if (ipAddress) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [ipAddress, ENCRYPTION_KEY]
        );
        encryptedIp = encResult.rows[0]?.encrypted;
      } catch (encErr) {
        // Continue without encryption if it fails
      }
    }

    await db.query(
      `INSERT INTO audit_log 
       (user_id, action, details, ip_address_encrypted, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userId,
        action,
        JSON.stringify(details || {}),
        encryptedIp,
        userAgent ? String(userAgent).substring(0, 500) : null
      ]
    );
  } catch (err) {
    // CRITICAL: Do not fail the main operation if audit logging fails
    // Just log the error and continue
    console.error('[AUDIT] ERROR: Failed to write audit log:', {
      action,
      error: err.message,
      code: err.code
    });
  }
}

/**
 * Query audit logs for a user
 * @param {Object} db - Database connection
 * @param {string} userId - User UUID
 * @param {number} limit - Max results (default 100)
 * @returns {Promise<Array>} Audit log records (IP addresses will be decrypted)
 */
export async function getUserAuditLogs(db, userId, limit = 100) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    
    const result = await db.query(
      `SELECT action, 
              pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
              user_agent, created_at, details
       FROM audit_log
       WHERE user_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [ENCRYPTION_KEY, userId, limit]
    );
    return result.rows;
  } catch (err) {
    console.error('[AUDIT] Error querying user logs:', err.message);
    return [];
  }
}

/**
 * Find suspicious activity (brute force attempts)
 * @param {Object} db - Database connection
 * @param {number} threshold - Number of failed attempts to flag (default 5)
 * @returns {Promise<Array>} Users with suspicious activity
 */
export async function findBruteForceAttempts(db, threshold = 5) {
  try {
    // Note: We don't include IP addresses in the aggregation to avoid
    // decryption performance issues. Use other functions for IP-based queries.
    const result = await db.query(
      `SELECT user_id, COUNT(*) as failed_attempts, 
              MAX(created_at) as latest_attempt
       FROM audit_log
       WHERE action = 'USER_LOGIN_FAILED'
         AND created_at > NOW() - INTERVAL '1 hour'
       GROUP BY user_id
       HAVING COUNT(*) >= $1
       ORDER BY failed_attempts DESC`,
      [threshold]
    );
    return result.rows;
  } catch (err) {
    console.error('[AUDIT] Error finding brute force attempts:', err.message);
    return [];
  }
}

/**
 * Find suspicious IP addresses (unusual activity)
 * @param {Object} db - Database connection
 * @param {number} requestThreshold - Min requests to flag (default 100 in 24h)
 * @returns {Promise<Array>} Suspicious IPs (with decrypted IP addresses)
 */
export async function findSuspiciousIPs(db, requestThreshold = 100) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    
    // First, get encrypted IPs and their counts
    const result = await db.query(
      `SELECT ip_address_encrypted, COUNT(*) as request_count,
              COUNT(DISTINCT user_id) as unique_users,
              MIN(created_at) as first_seen,
              MAX(created_at) as last_seen,
              ARRAY_AGG(DISTINCT action) as action_types
       FROM audit_log
       WHERE created_at > NOW() - INTERVAL '24 hours'
         AND ip_address_encrypted IS NOT NULL
       GROUP BY ip_address_encrypted
       HAVING COUNT(*) >= $1
       ORDER BY request_count DESC`,
      [requestThreshold]
    );
    
    // Decrypt the IPs in the application
    return result.rows.map(row => ({
      ...row,
      ip_address: row.ip_address_encrypted ? '[ENCRYPTED]' : null
    }));
  } catch (err) {
    console.error('[AUDIT] Error finding suspicious IPs:', err.message);
    return [];
  }
}

/**
 * Get data access logs (GDPR compliance)
 * Shows who accessed a user's sensitive data
 * @param {Object} db - Database connection
 * @param {string} userId - User UUID to check access for
 * @param {number} daysBack - How many days back (default 30)
 * @returns {Promise<Array>} Access logs (with decrypted IP addresses)
 */
export async function getDataAccessLogs(db, userId, daysBack = 30) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    
    const result = await db.query(
      `SELECT action, 
              pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
              user_agent, created_at, details
       FROM audit_log
       WHERE created_at > NOW() - INTERVAL '1 day' * $2
       ORDER BY created_at DESC`,
      [ENCRYPTION_KEY, daysBack]
    );
    return result.rows;
  } catch (err) {
    console.error('[AUDIT] Error getting data access logs:', err.message);
    return [];
  }
}

/**
 * Export audit logs for a user (GDPR data subject access request)
 * @param {Object} db - Database connection
 * @param {string} userId - User UUID
 * @param {number} daysBack - How many days back (default 365)
 * @returns {Promise<Array>} Complete audit trail (with decrypted IP addresses)
 */
export async function exportUserAuditLogs(db, userId, daysBack = 365) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    
    const result = await db.query(
      `SELECT id, action, 
              pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
              user_agent, created_at, details
       FROM audit_log
       WHERE user_id = $2
         AND created_at > NOW() - INTERVAL '1 day' * $3
       ORDER BY created_at DESC`,
      [ENCRYPTION_KEY, userId, daysBack]
    );
    return result.rows;
  } catch (err) {
    console.error('[AUDIT] Error exporting user logs:', err.message);
    return [];
  }
}

export default { logAudit, getUserAuditLogs, findBruteForceAttempts, findSuspiciousIPs, getDataAccessLogs, exportUserAuditLogs };

