/**
* Audit Logging Utility
 * Logs all critical actions to audit_logs table for compliance and security analysis
 * 
 * Usage:
 * await logAudit(db, {
 *   userId: user.user_id,
 *   action: 'USER_LOGIN_SUCCESS',
 *   resourceType: 'authentication',
 *   ipAddress: req.ip,
 *   userAgent: req.get('user-agent'),
 *   httpMethod: req.method,
 *   endpoint: req.path,
 *   status: 'SUCCESS',
 *   details: { email: user.email }
 * });
 */

/**
 * Log an action to the audit_logs table
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
    ipAddress = null,                 // From req.ip
    userAgent = null,                 // From req.get('user-agent')
    httpMethod = null,                // From req.method (GET, POST, DELETE, etc.)
    endpoint = null,                  // From req.path (/auth/login, /chat/send, etc.)
    status = 'SUCCESS',               // SUCCESS or FAILURE
    errorCode = null,                 // Error type if failed
    errorMessage = null,              // Error details (will be truncated to 500 chars)
    details = {},                     // JSONB object for action-specific metadata
    durationMs = null                 // Request duration in milliseconds
  } = options;

  console.log('[AUDIT] logAudit called with action:', action);

  // Validate required fields
  if (!action) {
    console.error('[AUDIT] ERROR: action is required for audit log');
    return;
  }
  
  console.log('[AUDIT] Inserting audit log: action=' + action + ', userId=' + userId + ', status=' + status);

  // Sanitize error message to prevent log injection
  let sanitizedErrorMessage = null;
  if (errorMessage) {
    sanitizedErrorMessage = String(errorMessage)
      .substring(0, 500)
      .replace(/[\n\r]/g, ' ');  // Remove newlines
  }

  // Validate status
  if (!['SUCCESS', 'FAILURE', 'BLOCKED'].includes(status)) {
    console.warn('[AUDIT] WARNING: Invalid status', status, '- defaulting to SUCCESS');
    status = 'SUCCESS';
  }

  try {
    await db.query(
      `INSERT INTO audit_logs 
       (user_id, is_temp_account, action, resource_type, resource_id,
        ip_address, user_agent, http_method, endpoint,
        status, error_code, error_message, details, duration_ms,
        created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [
        userId,
        isTemp,
        action,
        resourceType,
        resourceId,
        ipAddress,
        userAgent ? String(userAgent).substring(0, 500) : null,
        httpMethod,
        endpoint,
        status,
        errorCode,
        sanitizedErrorMessage,
        JSON.stringify(details || {}),
        durationMs
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
 * @returns {Promise<Array>} Audit log records
 */
export async function getUserAuditLogs(db, userId, limit = 100) {
  try {
    const result = await db.query(
      `SELECT action, resource_type, status, ip_address, user_agent,
              created_at, endpoint, duration_ms, details
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
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
    const result = await db.query(
      `SELECT user_id, COUNT(*) as failed_attempts, 
              MAX(created_at) as latest_attempt,
              ARRAY_AGG(DISTINCT ip_address) as ip_addresses
       FROM audit_logs
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
 * @returns {Promise<Array>} Suspicious IPs
 */
export async function findSuspiciousIPs(db, requestThreshold = 100) {
  try {
    const result = await db.query(
      `SELECT ip_address, COUNT(*) as request_count,
              COUNT(DISTINCT user_id) as unique_users,
              MIN(created_at) as first_seen,
              MAX(created_at) as last_seen,
              ARRAY_AGG(DISTINCT action) as action_types
       FROM audit_logs
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY ip_address
       HAVING COUNT(*) >= $1
       ORDER BY request_count DESC`,
      [requestThreshold]
    );
    return result.rows;
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
 * @returns {Promise<Array>} Access logs
 */
export async function getDataAccessLogs(db, userId, daysBack = 30) {
  try {
    const result = await db.query(
      `SELECT action, ip_address, user_agent, created_at, details
       FROM audit_logs
       WHERE resource_type IN ('messages', 'profile')
         AND created_at > NOW() - INTERVAL '1 day' * $1
       ORDER BY created_at DESC`,
      [daysBack]
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
 * @returns {Promise<Array>} Complete audit trail
 */
export async function exportUserAuditLogs(db, userId, daysBack = 365) {
  try {
    const result = await db.query(
      `SELECT id, action, resource_type, resource_id, ip_address, 
              user_agent, http_method, endpoint, status, error_code,
              error_message, details, duration_ms, created_at
       FROM audit_logs
       WHERE user_id = $1
         AND created_at > NOW() - INTERVAL '1 day' * $2
       ORDER BY created_at DESC`,
      [userId, daysBack]
    );
    return result.rows;
  } catch (err) {
    console.error('[AUDIT] Error exporting user logs:', err.message);
    return [];
  }
}

export default { logAudit, getUserAuditLogs, findBruteForceAttempts, findSuspiciousIPs, getDataAccessLogs, exportUserAuditLogs };
