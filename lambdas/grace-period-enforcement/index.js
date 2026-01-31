/**
 * Grace Period Enforcement Lambda Function
 * 
 * Scheduled to run every 6 hours via EventBridge
 * Automatically logs out users whose grace period has expired:
 * - Checks for users past 30-day grace period
 * - Invalidates their sessions to force re-login and policy acceptance
 * 
 * Schedule: 0 *\/6 * * * (every 6 hours)
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';

const logger = createLogger('grace-period-enforcement');

/**
 * Get current terms and privacy versions from environment
 */
function getCurrentVersions() {
  return {
    termsVersion: process.env.TERMS_VERSION || '1.0.0',
    privacyVersion: process.env.PRIVACY_VERSION || '1.0.0'
  };
}

/**
 * Query users with expired grace periods
 */
async function queryUsersWithExpiredGracePeriod(termsVersion, privacyVersion) {
  return await db.query(`
    SELECT 
      uc.user_id_hash,
      uc.grace_period_end,
      uc.last_notified_at
    FROM user_consents uc
    WHERE (
      uc.terms_version != $1 OR 
      uc.privacy_version != $2
    )
    AND uc.requires_consent_update = true
    AND uc.grace_period_end IS NOT NULL
    AND uc.grace_period_end < NOW()
    LIMIT 1000
  `, [termsVersion, privacyVersion]);
}

/**
 * Invalidate user sessions (force logout)
 */
async function invalidateUserSessions(userIdHash) {
  const result = await db.query(
    `DELETE FROM user_sessions
     WHERE user_id_hash = $1`,
    [userIdHash]
  );
  
  return result.rowCount || 0;
}

/**
 * Process a single user's grace period enforcement
 */
async function processUserEnforcement(user, stats) {
  const userHash = user.user_id_hash.substring(0, 8) + '...';
  
  try {
    // Invalidate all sessions for this user
    const sessionCount = await invalidateUserSessions(user.user_id_hash);
    stats.sessionsInvalidated += sessionCount;
    stats.usersProcessed++;
    
  } catch (error) {
    logger.errorFromCatch(error, `Process enforcement for ${userHash}`);
    stats.errors++;
  }
}

/**
 * Lambda handler function
 * @param {Object} event - EventBridge scheduled event
 * @returns {Object} Execution result
 */
export const handler = async (event) => {
  const startTime = Date.now();
  
  try {
    const versions = getCurrentVersions();
    
    // Query users with expired grace periods
    const expiredUsersQuery = await queryUsersWithExpiredGracePeriod(
      versions.termsVersion,
      versions.privacyVersion
    );
    
    const stats = {
      total: expiredUsersQuery.rows.length,
      usersProcessed: 0,
      sessionsInvalidated: 0,
      errors: 0
    };
    
    // Invalidate sessions for expired users
    for (const user of expiredUsersQuery.rows) {
      await processUserEnforcement(user, stats);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stats,
        duration_ms: duration
      })
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.errorFromCatch(error, 'Lambda execution failed');
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: duration
      })
    };
  }
};

export default { handler };
