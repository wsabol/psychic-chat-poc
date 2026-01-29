/**
 * Policy Reminder Lambda Function
 * 
 * Scheduled to run daily via EventBridge
 * Sends reminder notifications to users who haven't accepted new terms:
 * - Checks for users 21 days after initial policy notification
 * - Sends reminder email with grace period deadline
 * 
 * Schedule: 0 3 * * * (daily at 3:00 AM UTC)
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';

const logger = createLogger('policy-reminder');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Configuration
const CONFIG = {
  REMINDER_AFTER_DAYS: 21,
  REMINDER_WINDOW_DAYS: 1,
  MAX_NOTIFICATION_COUNT: 2,
  BATCH_SIZE: 1000
};

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
 * Query users who need reminder notifications
 */
async function queryUsersForReminder(termsVersion, privacyVersion) {
  const reminderStart = CONFIG.REMINDER_AFTER_DAYS;
  const reminderEnd = CONFIG.REMINDER_AFTER_DAYS + CONFIG.REMINDER_WINDOW_DAYS;
  
  return await db.query(`
    SELECT DISTINCT
      uc.user_id_hash,
      uc.terms_version,
      uc.privacy_version,
      uc.last_notified_at,
      uc.notification_count,
      uc.grace_period_end,
      pgp_sym_decrypt(upi.email_encrypted, $3) as email,
      upi.user_id
    FROM user_consents uc
    INNER JOIN user_personal_info upi 
      ON uc.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
    WHERE (
      uc.terms_version != $1 OR 
      uc.privacy_version != $2
    )
    AND uc.requires_consent_update = true
    AND uc.last_notified_at IS NOT NULL
    AND uc.last_notified_at <= NOW() - INTERVAL '${reminderStart} days'
    AND uc.last_notified_at > NOW() - INTERVAL '${reminderEnd} days'
    AND COALESCE(uc.notification_count, 0) < $4
    AND upi.email_encrypted IS NOT NULL
    AND upi.subscription_status = 'active'
    AND upi.user_id NOT LIKE 'temp_%'
    AND upi.deletion_requested_at IS NULL
    ORDER BY uc.last_notified_at ASC
    LIMIT $5
  `, [
    termsVersion,
    privacyVersion,
    ENCRYPTION_KEY,
    CONFIG.MAX_NOTIFICATION_COUNT,
    CONFIG.BATCH_SIZE
  ]);
}

/**
 * Update user notification tracking
 */
async function updateNotificationTracking(userIdHash) {
  await db.query(
    `UPDATE user_consents
     SET 
       last_notified_at = NOW(),
       notification_count = COALESCE(notification_count, 0) + 1,
       updated_at = NOW()
     WHERE user_id_hash = $1`,
    [userIdHash]
  );
}

/**
 * Process a single user reminder
 */
async function processUserReminder(user, stats) {
  const userHash = user.user_id_hash.substring(0, 8) + '...';
  
  try {
    // Validate email
    if (!user.email || user.email.trim() === '') {
      logger.info(`Skipping user with no email: ${userHash}`);
      stats.skipped++;
      return;
    }
    
    // Calculate days remaining
    const gracePeriodEnd = user.grace_period_end ? new Date(user.grace_period_end) : null;
    const daysRemaining = gracePeriodEnd 
      ? Math.ceil((gracePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 9;
    
    // TODO: Implement email sending via SES or SNS
    logger.info(`Would send policy reminder to ${user.user_id}, days remaining: ${daysRemaining}`);
    
    // Update database tracking
    await updateNotificationTracking(user.user_id_hash);
    
    stats.successful++;
    
  } catch (error) {
    logger.errorFromCatch(error, `Process user reminder for ${userHash}`);
    stats.failed++;
  }
}

/**
 * Lambda handler function
 * @param {Object} event - EventBridge scheduled event
 * @returns {Object} Execution result
 */
export const handler = async (event) => {
  const startTime = Date.now();
  logger.info('Starting policy reminder job', { event });
  
  try {
    // Validate environment
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    
    const versions = getCurrentVersions();
    logger.info(`Checking for users needing reminders (Terms: ${versions.termsVersion}, Privacy: ${versions.privacyVersion})`);
    
    // Query users who need reminders
    const usersQuery = await queryUsersForReminder(
      versions.termsVersion,
      versions.privacyVersion
    );
    
    const stats = {
      total: usersQuery.rows.length,
      successful: 0,
      failed: 0,
      skipped: 0
    };
    
    logger.info(`Found ${stats.total} users needing policy reminders`);
    
    // Process each user
    for (const user of usersQuery.rows) {
      await processUserReminder(user, stats);
    }
    
    const duration = Date.now() - startTime;
    logger.summary(stats, duration);
    
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
