/**
 * Policy Change Notification Job
 * 
 * Sends email notifications to users when Terms of Service or Privacy Policy are updated
 * Implements a configurable grace period with reminder notifications
 * 
 * REFACTORED for improved maintainability, testability, and robustness
 */

import { db } from '../shared/db.js';
import { sendPolicyChangeNotification } from '../shared/emailService.js';
import { getCurrentTermsVersion, getCurrentPrivacyVersion } from '../shared/versionConfig.js';
import VERSION_CONFIG from '../shared/versionConfig.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { logAudit } from '../shared/auditLog.js';

// ============ CONFIGURATION ============
const CONFIG = {
  GRACE_PERIOD_DAYS: 30,
  REMINDER_AFTER_DAYS: 21,
  REMINDER_WINDOW_DAYS: 1, // Window to catch users for reminder (21-22 days)
  MAX_NOTIFICATION_COUNT: 2, // Initial + 1 reminder
  BATCH_SIZE: 1000,
  EMAIL_RATE_LIMIT_MS: 100,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
};

// ============ JOB STATUS TRACKING ============
let lastRunTime = null;
let lastRunResult = null;

// ============ HELPER FUNCTIONS ============

/**
 * Calculate grace period end date
 * @param {Date} startDate - Start date for grace period
 * @param {number} days - Number of days for grace period
 * @returns {Date} Grace period end date
 */
function calculateGracePeriodEnd(startDate = new Date(), days = CONFIG.GRACE_PERIOD_DAYS) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate;
}

/**
 * Determine which document(s) changed and build change info
 * @returns {Object|null} Change information or null if no major changes
 */
function determineDocumentChanges() {
  const currentTermsVersion = getCurrentTermsVersion();
  const currentPrivacyVersion = getCurrentPrivacyVersion();
  
  const termsIsMajor = VERSION_CONFIG.terms.changeType === 'MAJOR';
  const privacyIsMajor = VERSION_CONFIG.privacy.changeType === 'MAJOR';
  
  if (!termsIsMajor && !privacyIsMajor) {
    return null; // No major changes requiring notification
  }
  
  let documentType, changeDescription;
  
  if (termsIsMajor && privacyIsMajor) {
    documentType = 'both';
    changeDescription = `We've updated both our Terms of Service (v${currentTermsVersion}) and Privacy Policy (v${currentPrivacyVersion}) to better serve you and maintain compliance.`;
  } else if (termsIsMajor) {
    documentType = 'terms';
    changeDescription = VERSION_CONFIG.terms.description || 
      `We've updated our Terms of Service to v${currentTermsVersion}.`;
  } else {
    documentType = 'privacy';
    changeDescription = VERSION_CONFIG.privacy.description || 
      `We've updated our Privacy Policy to v${currentPrivacyVersion}.`;
  }
  
  return {
    documentType,
    version: documentType === 'both' 
      ? `${currentTermsVersion}/${currentPrivacyVersion}`
      : (documentType === 'terms' ? currentTermsVersion : currentPrivacyVersion),
    changeType: 'MAJOR',
    description: changeDescription,
    currentTermsVersion,
    currentPrivacyVersion
  };
}

/**
 * Build change info for reminder notifications
 * @param {Object} changeInfo - Base change information
 * @returns {Object} Updated change info for reminders
 */
function buildReminderChangeInfo(changeInfo) {
  const { documentType, currentTermsVersion, currentPrivacyVersion } = changeInfo;
  
  let changeDescription;
  
  if (documentType === 'both') {
    changeDescription = `Reminder: Please review and accept our updated Terms of Service (v${currentTermsVersion}) and Privacy Policy (v${currentPrivacyVersion}).`;
  } else if (documentType === 'terms') {
    changeDescription = VERSION_CONFIG.terms.description || 
      `Reminder: Please review and accept our updated Terms of Service (v${currentTermsVersion}).`;
  } else {
    changeDescription = VERSION_CONFIG.privacy.description || 
      `Reminder: Please review and accept our updated Privacy Policy (v${currentPrivacyVersion}).`;
  }
  
  return {
    ...changeInfo,
    description: changeDescription
  };
}

/**
 * Validate user email
 * @param {string} email - User email
 * @param {string} userHash - User ID hash (for logging)
 * @returns {boolean} True if email is valid
 */
function validateEmail(email, userHash) {
  if (!email || email.trim() === '') {
    logErrorFromCatch(
      `[Policy Notification Job] Skipping user with no email: ${userHash.substring(0, 8)}...`
    );
    return false;
  }
  return true;
}

/**
 * Rate limiter - small delay between operations
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function rateLimit(ms = CONFIG.EMAIL_RATE_LIMIT_MS) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate user hash for logging
 * @param {string} userHash - Full user hash
 * @returns {string} Truncated hash
 */
function truncateHash(userHash) {
  return userHash ? userHash.substring(0, 8) + '...' : 'unknown';
}

// ============ DATABASE QUERIES ============

/**
 * Query users who need initial notifications
 * @param {string} termsVersion - Current terms version
 * @param {string} privacyVersion - Current privacy version
 * @returns {Promise<Array>} Users to notify
 */
async function queryUsersForInitialNotification(termsVersion, privacyVersion) {
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
    AND (
      uc.last_notified_at IS NULL OR
      uc.last_notified_at < NOW() - INTERVAL '${CONFIG.GRACE_PERIOD_DAYS} days'
    )
    AND upi.email_encrypted IS NOT NULL
    AND upi.subscription_status = 'active'
    AND upi.user_id NOT LIKE 'temp_%'
    AND upi.deletion_requested_at IS NULL
    ORDER BY uc.last_notified_at ASC NULLS FIRST
    LIMIT $4
  `, [termsVersion, privacyVersion, CONFIG.ENCRYPTION_KEY, CONFIG.BATCH_SIZE]);
}

/**
 * Query users who need reminder notifications
 * @param {string} termsVersion - Current terms version
 * @param {string} privacyVersion - Current privacy version
 * @returns {Promise<Array>} Users to remind
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
    CONFIG.ENCRYPTION_KEY,
    CONFIG.MAX_NOTIFICATION_COUNT,
    CONFIG.BATCH_SIZE
  ]);
}

/**
 * Query users with expired grace periods
 * @param {string} termsVersion - Current terms version
 * @param {string} privacyVersion - Current privacy version
 * @returns {Promise<Array>} Users with expired grace periods
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
    LIMIT $3
  `, [termsVersion, privacyVersion, CONFIG.BATCH_SIZE]);
}

/**
 * Update user notification tracking
 * @param {string} userIdHash - User ID hash
 * @param {Date|null} gracePeriodEnd - Grace period end date (null for reminders)
 * @returns {Promise<void>}
 */
async function updateNotificationTracking(userIdHash, gracePeriodEnd = null) {
  const params = [userIdHash];
  let query = `
    UPDATE user_consents
    SET 
      last_notified_at = NOW(),
      notification_count = COALESCE(notification_count, 0) + 1,
      updated_at = NOW()
  `;
  
  if (gracePeriodEnd) {
    params.push(gracePeriodEnd);
    query += `, grace_period_end = $2`;
  }
  
  query += ` WHERE user_id_hash = $1`;
  
  await db.query(query, params);
}

/**
 * Invalidate user sessions (for grace period enforcement)
 * @param {string} userIdHash - User ID hash
 * @returns {Promise<number>} Number of sessions invalidated
 */
async function invalidateUserSessions(userIdHash) {
  const result = await db.query(`
    DELETE FROM user_sessions
    WHERE user_id_hash = $1
  `, [userIdHash]);
  
  return result.rowCount || 0;
}

// ============ CORE NOTIFICATION LOGIC ============

/**
 * Process a single user for notification
 * @param {Object} user - User record
 * @param {Object} changeInfo - Change information
 * @param {boolean} isReminder - Whether this is a reminder notification
 * @returns {Promise<Object>} Processing result
 */
async function processUserNotification(user, changeInfo, isReminder = false) {
  const userHash = truncateHash(user.user_id_hash);
  
  try {
    // Validate email
    if (!validateEmail(user.email, user.user_id_hash)) {
      return { success: false, error: 'Invalid email' };
    }
    
    // Determine grace period end
    const gracePeriodEnd = isReminder 
      ? (user.grace_period_end || calculateGracePeriodEnd(new Date(), 9)) // Fallback: 9 days remaining
      : changeInfo.gracePeriodEnd;
    
    // Prepare notification info
    const notificationInfo = {
      ...changeInfo,
      gracePeriodEnd
    };
    
    // Send email
    const emailResult = await sendPolicyChangeNotification(
      user.email, 
      notificationInfo, 
      isReminder
    );
    
    if (!emailResult.success) {
      logErrorFromCatch(
        `[Policy Notification Job] Failed to send to user ${userHash}: ${emailResult.error}`
      );
      return { success: false, error: emailResult.error };
    }
    
    // Update database tracking
    await updateNotificationTracking(
      user.user_id_hash, 
      isReminder ? null : gracePeriodEnd
    );
    
    // Rate limiting
    await rateLimit();
    
    return { success: true };
    
  } catch (error) {
    logErrorFromCatch(
      `[Policy Notification Job] Error processing user ${userHash}:`, 
      error.message
    );
    logErrorFromCatch(error, 'job', `policy_notification_${isReminder ? 'reminder' : 'initial'}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process batch of users for notifications
 * @param {Array} users - Users to process
 * @param {Object} changeInfo - Change information
 * @param {boolean} isReminder - Whether these are reminder notifications
 * @returns {Promise<Object>} Batch processing results
 */
async function processBatch(users, changeInfo, isReminder = false) {
  const results = {
    total: users.length,
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (const user of users) {
    const result = await processUserNotification(user, changeInfo, isReminder);
    
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push({
        user: truncateHash(user.user_id_hash),
        error: result.error
      });
    }
  }
  
  return results;
}

// ============ PUBLIC INTERFACE ============

/**
 * Send initial policy change notifications
 * Called when admin triggers notification after updating .env versions
 * Sets grace period deadline
 */
export async function sendInitialPolicyNotifications() {
  const startTime = new Date();
  
  try {
    // Determine what changed
    const changeInfo = determineDocumentChanges();
    
    if (!changeInfo) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        skipped: true,
        message: 'No major policy changes require notification'
      };
    }
    
    // Calculate grace period
    const gracePeriodEnd = calculateGracePeriodEnd();
    changeInfo.gracePeriodEnd = gracePeriodEnd;
    
    // Query users
    const usersQuery = await queryUsersForInitialNotification(
      changeInfo.currentTermsVersion,
      changeInfo.currentPrivacyVersion
    );
    
    // Process batch
    const results = await processBatch(usersQuery.rows, changeInfo, false);
    results.gracePeriodEnd = gracePeriodEnd;
    
    // Update job status
    lastRunTime = startTime;
    lastRunResult = results;
    
    // Log summary
    const duration = new Date() - startTime;
    console.log(
      `[Policy Notification Job] Initial notifications completed: ` +
      `${results.successful}/${results.total} sent in ${duration}ms`
    );
    
    return results;
    
  } catch (error) {
    logErrorFromCatch('[Policy Notification Job] Fatal error:', error.message);
    logErrorFromCatch(error, 'job', 'policy_notification_initial');
    throw error;
  }
}

/**
 * Send reminder notifications
 * Called N days after initial notification (configurable via CONFIG.REMINDER_AFTER_DAYS)
 * Only sends to users who haven't accepted yet
 */
export async function sendReminderNotifications() {
  const startTime = new Date();
  
  try {
    // Determine what changed
    const baseChangeInfo = determineDocumentChanges();
    
    if (!baseChangeInfo) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        skipped: true,
        message: 'No major policy changes require reminders'
      };
    }
    
    // Build reminder-specific change info
    const changeInfo = buildReminderChangeInfo(baseChangeInfo);
    
    // Query users
    const usersQuery = await queryUsersForReminder(
      changeInfo.currentTermsVersion,
      changeInfo.currentPrivacyVersion
    );
    
    // Process batch
    const results = await processBatch(usersQuery.rows, changeInfo, true);
    
    // Log summary
    const duration = new Date() - startTime;
    console.log(
      `[Policy Notification Job] Reminder notifications completed: ` +
      `${results.successful}/${results.total} sent in ${duration}ms`
    );
    
    return results;
    
  } catch (error) {
    logErrorFromCatch('[Policy Notification Job] Fatal error in reminder job:', error.message);
    logErrorFromCatch(error, 'job', 'policy_notification_reminder');
    throw error;
  }
}

/**
 * Auto-logout users who haven't accepted after grace period expires
 * Invalidates sessions for non-compliant users past the deadline
 */
export async function enforceGracePeriodExpiration() {
  const startTime = new Date();
  
  try {
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();
    
    // Query users with expired grace periods
    const expiredUsersQuery = await queryUsersWithExpiredGracePeriod(
      currentTermsVersion,
      currentPrivacyVersion
    );
    
    const results = {
      total: expiredUsersQuery.rows.length,
      sessionsInvalidated: 0,
      errors: []
    };
    
    // Invalidate sessions for expired users
    for (const user of expiredUsersQuery.rows) {
      try {
        const sessionCount = await invalidateUserSessions(user.user_id_hash);
        results.sessionsInvalidated += sessionCount;
        
      } catch (error) {
        const userHash = truncateHash(user.user_id_hash);
        results.errors.push({ user: userHash, error: error.message });
        logErrorFromCatch(
          `[Policy Notification Job] Error invalidating sessions for user ${userHash}:`,
          error.message
        );
        logErrorFromCatch(error, 'job', 'grace_period_enforcement');
      }
    }
    
    // Log summary
    const duration = new Date() - startTime;
    console.log(
      `[Policy Notification Job] Grace period enforcement completed: ` +
      `${results.sessionsInvalidated} sessions invalidated for ${results.total} users in ${duration}ms`
    );
    
    return results;
    
  } catch (error) {
    logErrorFromCatch('[Policy Notification Job] Fatal error in grace period enforcement:', error.message);
    logErrorFromCatch(error, 'job', 'grace_period_enforcement');
    throw error;
  }
}

/**
 * Get job status
 * @returns {Object} Job status information
 */
export function getPolicyNotificationJobStatus() {
  return {
    lastRun: lastRunTime,
    lastResult: lastRunResult,
    status: 'active',
    config: CONFIG
  };
}

/**
 * Get current configuration (useful for testing and monitoring)
 * @returns {Object} Current configuration
 */
export function getConfig() {
  return { ...CONFIG };
}

/**
 * Update configuration (useful for testing)
 * @param {Object} newConfig - Configuration updates
 */
export function updateConfig(newConfig) {
  Object.assign(CONFIG, newConfig);
}

// ============ EXPORTS ============
export default {
  sendInitialPolicyNotifications,
  sendReminderNotifications,
  enforceGracePeriodExpiration,
  getPolicyNotificationJobStatus,
  getConfig,
  updateConfig
};
