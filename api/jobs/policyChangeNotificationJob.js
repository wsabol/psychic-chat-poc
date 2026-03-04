/**
 * Policy Change Notification Job
 *
 * Sends email notifications to users when Terms of Service or Privacy Policy are updated.
 * Implements a configurable grace period with reminder notifications.
 *
 * Flow:
 *   1. Admin triggers sendInitialPolicyNotifications() after updating version env vars.
 *   2. Scheduler runs sendReminderNotifications() daily — fires at day 21 for non-compliant users.
 *   3. Scheduler runs enforceGracePeriodExpiration() every 6 hours — invalidates sessions at day 30+.
 *
 * Notification types:
 *   - Initial:     Triggered by admin; sets the 30-day grace period deadline.
 *   - Reminder:    Sent on day 21 (9 days before deadline); only to users who haven't accepted.
 *   - Enforcement: Invalidates sessions for users past the 30-day deadline.
 */

import { db } from '../shared/db.js';
import { sendPolicyChangeNotification } from '../shared/emailService.js';
import { getCurrentTermsVersion, getCurrentPrivacyVersion } from '../shared/versionConfig.js';
import VERSION_CONFIG from '../shared/versionConfig.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

// ============ CONFIGURATION ============
const CONFIG = {
  GRACE_PERIOD_DAYS: 30,
  REMINDER_AFTER_DAYS: 21,
  REMINDER_WINDOW_DAYS: 1,              // Catch users in a 1-day window (days 21–22 after initial)
  REMINDER_FALLBACK_REMAINING_DAYS: 9,  // If grace_period_end is missing on reminder, default to 9 days remaining
  MAX_NOTIFICATION_COUNT: 2,            // Initial + 1 reminder
  BATCH_SIZE: 1000,
  EMAIL_RATE_LIMIT_MS: 100,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
};

// ============ JOB STATUS TRACKING ============
// Tracks the most recent run time and result for each job type independently.
const jobStatus = {
  initial:     { lastRunTime: null, lastResult: null },
  reminder:    { lastRunTime: null, lastResult: null },
  enforcement: { lastRunTime: null, lastResult: null }
};

// ============ HELPER FUNCTIONS ============

/**
 * Calculate a grace period end date.
 * @param {Date} startDate - Start date (defaults to now)
 * @param {number} days - Number of days (defaults to CONFIG.GRACE_PERIOD_DAYS)
 * @returns {Date}
 */
function calculateGracePeriodEnd(startDate = new Date(), days = CONFIG.GRACE_PERIOD_DAYS) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate;
}

/**
 * Build a human-readable change description for the notification email.
 * Centralises the description logic shared by initial notifications and reminders,
 * eliminating duplication between determineDocumentChanges() and the old buildReminderChangeInfo().
 *
 * @param {string} documentType - 'terms' | 'privacy' | 'both'
 * @param {string} currentTermsVersion
 * @param {string} currentPrivacyVersion
 * @param {boolean} isReminder - True when building text for a reminder email
 * @returns {string}
 */
function buildChangeDescription(documentType, currentTermsVersion, currentPrivacyVersion, isReminder = false) {
  if (documentType === 'both') {
    return isReminder
      ? `Reminder: Please review and accept our updated Terms of Service (v${currentTermsVersion}) and Privacy Policy (v${currentPrivacyVersion}).`
      : `We've updated both our Terms of Service (v${currentTermsVersion}) and Privacy Policy (v${currentPrivacyVersion}) to better serve you and maintain compliance.`;
  }

  if (documentType === 'terms') {
    // Use the config description only for initial notifications (not reminders).
    if (VERSION_CONFIG.terms.description && !isReminder) return VERSION_CONFIG.terms.description;
    return isReminder
      ? `Reminder: Please review and accept our updated Terms of Service (v${currentTermsVersion}).`
      : `We've updated our Terms of Service to v${currentTermsVersion}.`;
  }

  // documentType === 'privacy'
  if (VERSION_CONFIG.privacy.description && !isReminder) return VERSION_CONFIG.privacy.description;
  return isReminder
    ? `Reminder: Please review and accept our updated Privacy Policy (v${currentPrivacyVersion}).`
    : `We've updated our Privacy Policy to v${currentPrivacyVersion}.`;
}

/**
 * Determine which document(s) changed and build the change info object.
 * Returns null if no MAJOR changes requiring notification are found.
 *
 * @param {boolean} isReminder - Pass true when building change info for a reminder email
 * @returns {Object|null}
 */
function determineDocumentChanges(isReminder = false) {
  const currentTermsVersion = getCurrentTermsVersion();
  const currentPrivacyVersion = getCurrentPrivacyVersion();

  const termsIsMajor   = VERSION_CONFIG.terms.changeType   === 'MAJOR';
  const privacyIsMajor = VERSION_CONFIG.privacy.changeType === 'MAJOR';

  if (!termsIsMajor && !privacyIsMajor) return null;

  let documentType;
  if (termsIsMajor && privacyIsMajor) {
    documentType = 'both';
  } else {
    documentType = termsIsMajor ? 'terms' : 'privacy';
  }

  return {
    documentType,
    version: documentType === 'both'
      ? `${currentTermsVersion}/${currentPrivacyVersion}`
      : (documentType === 'terms' ? currentTermsVersion : currentPrivacyVersion),
    changeType: 'MAJOR',
    description: buildChangeDescription(documentType, currentTermsVersion, currentPrivacyVersion, isReminder),
    currentTermsVersion,
    currentPrivacyVersion
  };
}

/**
 * Validate that a user has a usable email address.
 * Logs a warning and returns false if invalid.
 * @param {string} email
 * @param {string} userIdHash
 * @returns {boolean}
 */
function validateEmail(email, userIdHash) {
  if (!email || email.trim() === '') {
    logErrorFromCatch(
      new Error(`Skipping user with no email: ${truncateHash(userIdHash)}`),
      'job',
      'policy_notification_validate_email'
    );
    return false;
  }
  return true;
}

/**
 * Small delay between email sends to stay within rate limits.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function rateLimit(ms = CONFIG.EMAIL_RATE_LIMIT_MS) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate a user hash to 8 chars for safe logging.
 * @param {string} userHash
 * @returns {string}
 */
function truncateHash(userHash) {
  return userHash ? `${userHash.substring(0, 8)}...` : 'unknown';
}

// ============ DATABASE QUERIES ============

/**
 * Shared SELECT / FROM / JOIN / common WHERE fragment used by both user notification queries.
 * Additional WHERE conditions and ORDER BY / LIMIT are appended by each query function.
 *
 * Parameters (positional):
 *   $1 — termsVersion
 *   $2 — privacyVersion
 *   $3 — ENCRYPTION_KEY  (used by pgp_sym_decrypt)
 *
 * NOTE: The INTERVAL literals below use CONFIG values embedded at call-time via template
 * literals in each query function. This is intentional — PostgreSQL does not support
 * parameterized INTERVAL expressions — and is safe because CONFIG values are not user-supplied.
 */
const USER_NOTIFICATION_SELECT = `
  SELECT DISTINCT
    uc.user_id_hash,
    uc.terms_version,
    uc.privacy_version,
    uc.last_notified_at,
    uc.notification_count,
    uc.grace_period_end,
    pgp_sym_decrypt(upi.email_encrypted, $3) as email,
    upi.user_id,
    COALESCE(up.language, 'en-US') as language
  FROM user_consents uc
  INNER JOIN user_personal_info upi
    ON uc.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
  LEFT JOIN user_preferences up
    ON up.user_id_hash = uc.user_id_hash
  WHERE (
    uc.terms_version != $1 OR
    uc.privacy_version != $2
  )
  AND uc.requires_consent_update = true
  AND upi.email_encrypted IS NOT NULL
  AND upi.user_id NOT LIKE 'temp_%'
  AND upi.deletion_requested_at IS NULL
`;

/**
 * Query users who need an initial notification.
 * Includes users never notified, and users whose last notification was over GRACE_PERIOD_DAYS ago
 * (indicating a new policy cycle since the previous one expired).
 *
 * @param {string} termsVersion
 * @param {string} privacyVersion
 * @returns {Promise<{rows: Array}>}
 */
async function queryUsersForInitialNotification(termsVersion, privacyVersion) {
  return db.query(`
    ${USER_NOTIFICATION_SELECT}
    AND (
      uc.last_notified_at IS NULL OR
      uc.last_notified_at < NOW() - INTERVAL '${CONFIG.GRACE_PERIOD_DAYS} days'
    )
    ORDER BY uc.last_notified_at ASC NULLS FIRST
    LIMIT $4
  `, [termsVersion, privacyVersion, CONFIG.ENCRYPTION_KEY, CONFIG.BATCH_SIZE]);
}

/**
 * Query users who need a reminder notification.
 * Targets users whose initial notification was sent between REMINDER_AFTER_DAYS and
 * REMINDER_AFTER_DAYS + REMINDER_WINDOW_DAYS ago and who still haven't accepted.
 *
 * @param {string} termsVersion
 * @param {string} privacyVersion
 * @returns {Promise<{rows: Array}>}
 */
async function queryUsersForReminder(termsVersion, privacyVersion) {
  const reminderStart = CONFIG.REMINDER_AFTER_DAYS;
  const reminderEnd   = CONFIG.REMINDER_AFTER_DAYS + CONFIG.REMINDER_WINDOW_DAYS;

  return db.query(`
    ${USER_NOTIFICATION_SELECT}
    AND uc.last_notified_at IS NOT NULL
    AND uc.last_notified_at <= NOW() - INTERVAL '${reminderStart} days'
    AND uc.last_notified_at >  NOW() - INTERVAL '${reminderEnd} days'
    AND COALESCE(uc.notification_count, 0) < $4
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
 * Query users whose grace period has expired without accepting the updated policies.
 * @param {string} termsVersion
 * @param {string} privacyVersion
 * @returns {Promise<{rows: Array}>}
 */
async function queryUsersWithExpiredGracePeriod(termsVersion, privacyVersion) {
  return db.query(`
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
 * Update notification tracking columns for a user after a successful email send.
 * On the initial notification, also sets grace_period_end.
 *
 * @param {string} userIdHash
 * @param {Date|null} gracePeriodEnd - Set on initial send; omit for reminders
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
 * Invalidate all active sessions for a user.
 * Used when the grace period expires to force re-login and trigger the consent gate.
 *
 * @param {string} userIdHash
 * @returns {Promise<number>} Number of sessions deleted
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
 * Process a single user for a notification or reminder email.
 *
 * @param {Object} user - User row from the database query
 * @param {Object} changeInfo - Change information object
 * @param {boolean} isReminder - True when sending a reminder
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function processUserNotification(user, changeInfo, isReminder = false) {
  const userHash = truncateHash(user.user_id_hash);

  try {
    if (!validateEmail(user.email, user.user_id_hash)) {
      return { success: false, error: 'Invalid email' };
    }

    // For reminders, preserve the stored deadline; fall back to a short CONFIG-defined window
    // if grace_period_end was somehow never set.
    const gracePeriodEnd = isReminder
      ? (user.grace_period_end || calculateGracePeriodEnd(new Date(), CONFIG.REMINDER_FALLBACK_REMAINING_DAYS))
      : changeInfo.gracePeriodEnd;

    const emailResult = await sendPolicyChangeNotification(
      user.email,
      { ...changeInfo, gracePeriodEnd },
      isReminder,
      user.language || 'en-US'
    );

    if (!emailResult.success) {
      logErrorFromCatch(
        new Error(`Email send failed for user ${userHash}: ${emailResult.error}`),
        'job',
        `policy_notification_${isReminder ? 'reminder' : 'initial'}`
      );
      return { success: false, error: emailResult.error };
    }

    await updateNotificationTracking(user.user_id_hash, isReminder ? null : gracePeriodEnd);
    await rateLimit();

    return { success: true };

  } catch (error) {
    logErrorFromCatch(error, 'job', `policy_notification_${isReminder ? 'reminder' : 'initial'}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process a batch of users for notification or reminder emails.
 *
 * @param {Array} users - Rows from a notification query
 * @param {Object} changeInfo - Change information object
 * @param {boolean} isReminder - True when sending reminders
 * @returns {Promise<{total: number, successful: number, failed: number, errors: Array}>}
 */
async function processBatch(users, changeInfo, isReminder = false) {
  const results = { total: users.length, successful: 0, failed: 0, errors: [] };

  for (const user of users) {
    const result = await processUserNotification(user, changeInfo, isReminder);
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push({ user: truncateHash(user.user_id_hash), error: result.error });
    }
  }

  return results;
}

// ============ PUBLIC INTERFACE ============

/**
 * Send initial policy change notifications.
 * Called by an admin after updating version env vars.
 * Sets a 30-day grace period deadline for each notified user.
 *
 * @returns {Promise<Object>} Batch results
 */
export async function sendInitialPolicyNotifications() {
  const startTime = new Date();

  try {
    const changeInfo = determineDocumentChanges(false);
    if (!changeInfo) {
      return {
        total: 0, successful: 0, failed: 0, errors: [],
        skipped: true,
        message: 'No major policy changes require notification'
      };
    }

    const gracePeriodEnd = calculateGracePeriodEnd();
    changeInfo.gracePeriodEnd = gracePeriodEnd;

    const { rows } = await queryUsersForInitialNotification(
      changeInfo.currentTermsVersion,
      changeInfo.currentPrivacyVersion
    );

    const results = await processBatch(rows, changeInfo, false);
    results.gracePeriodEnd = gracePeriodEnd;

    const durationMs = Date.now() - startTime.getTime();
    console.log(`[Policy Notification Job] Initial: ${results.successful}/${results.total} sent in ${durationMs}ms`);

    jobStatus.initial = { lastRunTime: startTime, lastResult: results };
    return results;

  } catch (error) {
    logErrorFromCatch(error, 'job', 'policy_notification_initial');
    throw error;
  }
}

/**
 * Send reminder notifications to users who haven't accepted yet.
 * Runs daily (scheduler); only fires for users in the day-21–22 window after initial notification.
 *
 * @returns {Promise<Object>} Batch results
 */
export async function sendReminderNotifications() {
  const startTime = new Date();

  try {
    const changeInfo = determineDocumentChanges(true);
    if (!changeInfo) {
      return {
        total: 0, successful: 0, failed: 0, errors: [],
        skipped: true,
        message: 'No major policy changes require reminders'
      };
    }

    const { rows } = await queryUsersForReminder(
      changeInfo.currentTermsVersion,
      changeInfo.currentPrivacyVersion
    );

    const results = await processBatch(rows, changeInfo, true);

    const durationMs = Date.now() - startTime.getTime();
    console.log(`[Policy Notification Job] Reminder: ${results.successful}/${results.total} sent in ${durationMs}ms`);

    jobStatus.reminder = { lastRunTime: startTime, lastResult: results };
    return results;

  } catch (error) {
    logErrorFromCatch(error, 'job', 'policy_notification_reminder');
    throw error;
  }
}

/**
 * Invalidate sessions for users whose grace period has expired.
 * Runs every 6 hours (scheduler); forces re-login and triggers the consent gate on next access.
 *
 * @returns {Promise<Object>} Enforcement results
 */
export async function enforceGracePeriodExpiration() {
  const startTime = new Date();

  try {
    const currentTermsVersion   = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();

    const { rows } = await queryUsersWithExpiredGracePeriod(currentTermsVersion, currentPrivacyVersion);
    const results = { total: rows.length, sessionsInvalidated: 0, errors: [] };

    for (const user of rows) {
      try {
        results.sessionsInvalidated += await invalidateUserSessions(user.user_id_hash);
      } catch (error) {
        results.errors.push({ user: truncateHash(user.user_id_hash), error: error.message });
        logErrorFromCatch(error, 'job', 'grace_period_enforcement');
      }
    }

    const durationMs = Date.now() - startTime.getTime();
    console.log(`[Policy Notification Job] Enforcement: ${results.sessionsInvalidated} sessions invalidated from ${results.total} users in ${durationMs}ms`);

    jobStatus.enforcement = { lastRunTime: startTime, lastResult: results };
    return results;

  } catch (error) {
    logErrorFromCatch(error, 'job', 'grace_period_enforcement');
    throw error;
  }
}

/**
 * Get the most recent run time and result for all three job types.
 * @returns {Object}
 */
export function getPolicyNotificationJobStatus() {
  return {
    status: 'active',
    config: CONFIG,
    jobs: {
      initial:     jobStatus.initial,
      reminder:    jobStatus.reminder,
      enforcement: jobStatus.enforcement
    }
  };
}

/**
 * Return a shallow copy of the current configuration (useful for testing and monitoring).
 * @returns {Object}
 */
export function getConfig() {
  return { ...CONFIG };
}

/**
 * Override configuration values at runtime (useful for testing).
 * @param {Partial<typeof CONFIG>} newConfig
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
