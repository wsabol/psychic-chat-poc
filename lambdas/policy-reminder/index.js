/**
 * Policy Reminder Lambda Function
 *
 * Scheduled to run daily via EventBridge (0 3 * * * — 3:00 AM UTC).
 * Sends reminder emails to users who have not yet accepted the current
 * Terms of Service and/or Privacy Policy, exactly 21 days after their
 * initial notification (leaving 9 days before the 30-day grace period expires).
 *
 * Email opt-out:
 *   The SQL query filters out users whose user_settings.email_marketing_enabled
 *   is explicitly false.  Users with no settings row are treated as opted in
 *   (COALESCE default = true).
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';
import { sendPolicyReminderEmail } from '../shared/emailService.js';

const logger         = createLogger('policy-reminder');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────

const CONFIG = {
  REMINDER_AFTER_DAYS:  21, // Send reminder 21 days after initial notification
  REMINDER_WINDOW_DAYS:  1, // 1-day window so we don't miss anyone (21–22 days)
  MAX_NOTIFICATION_COUNT: 2, // Initial + 1 reminder = 2 total notifications max
  BATCH_SIZE: 1000,
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

/**
 * Read the authoritative Terms and Privacy versions from environment variables.
 * These must be set in the Lambda's environment configuration in AWS.
 */
function getCurrentVersions() {
  return {
    termsVersion:   process.env.TERMS_VERSION   || '1.0.0',
    privacyVersion: process.env.PRIVACY_VERSION || '1.0.0',
  };
}

/**
 * Determine which document(s) the user is behind on and return a
 * documentType string suitable for the email template.
 *
 * @param {string} userTermsVersion   - The version in the user's consent record
 * @param {string} userPrivacyVersion
 * @param {string} currentTermsVersion
 * @param {string} currentPrivacyVersion
 * @returns {'terms'|'privacy'|'both'}
 */
function resolveDocumentType(userTermsVersion, userPrivacyVersion, currentTermsVersion, currentPrivacyVersion) {
  const termsOutdated   = userTermsVersion   !== currentTermsVersion;
  const privacyOutdated = userPrivacyVersion !== currentPrivacyVersion;

  if (termsOutdated && privacyOutdated) return 'both';
  if (termsOutdated)                    return 'terms';
  return 'privacy';
}

// ─────────────────────────────────────────────
//  DATABASE QUERY
// ─────────────────────────────────────────────

/**
 * Find users who:
 *   • Have not accepted the current terms / privacy policy
 *   • Were initially notified 21–22 days ago (the reminder window)
 *   • Have received fewer than MAX_NOTIFICATION_COUNT notifications so far
 *   • Have an active subscription and are not pending deletion
 *   • Have NOT opted out of email (user_settings.email_marketing_enabled ≠ false)
 *
 * Returns up to BATCH_SIZE rows.
 */
async function queryUsersForReminder(termsVersion, privacyVersion) {
  const { REMINDER_AFTER_DAYS, REMINDER_WINDOW_DAYS, MAX_NOTIFICATION_COUNT, BATCH_SIZE } = CONFIG;
  const reminderEnd = REMINDER_AFTER_DAYS + REMINDER_WINDOW_DAYS;

  return db.query(
    `SELECT DISTINCT
       uc.user_id_hash,
       uc.terms_version         AS user_terms_version,
       uc.privacy_version       AS user_privacy_version,
       uc.last_notified_at,
       uc.notification_count,
       uc.grace_period_end,
       pgp_sym_decrypt(upi.email_encrypted, $3) AS email,
       upi.user_id
     FROM user_consents uc
     INNER JOIN user_personal_info upi
             ON uc.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
     LEFT  JOIN user_settings us
             ON us.user_id_hash = uc.user_id_hash
     WHERE (uc.terms_version   != $1 OR uc.privacy_version != $2)
       AND uc.requires_consent_update = true
       AND uc.last_notified_at IS NOT NULL
       AND uc.last_notified_at <= NOW() - INTERVAL '${REMINDER_AFTER_DAYS} days'
       AND uc.last_notified_at  > NOW() - INTERVAL '${reminderEnd} days'
       AND COALESCE(uc.notification_count, 0) < $4
       AND upi.email_encrypted IS NOT NULL
       AND upi.subscription_status = 'active'
       AND upi.user_id NOT LIKE 'temp_%'
       AND upi.deletion_requested_at IS NULL
       AND COALESCE(us.email_marketing_enabled, true) = true
     ORDER BY uc.last_notified_at ASC
     LIMIT $5`,
    [
      termsVersion,
      privacyVersion,
      ENCRYPTION_KEY,
      MAX_NOTIFICATION_COUNT,
      BATCH_SIZE,
    ]
  );
}

/**
 * Increment notification_count and update last_notified_at for a user.
 * Called after a reminder email is successfully sent.
 */
async function updateNotificationTracking(userIdHash) {
  await db.query(
    `UPDATE user_consents
        SET last_notified_at  = NOW(),
            notification_count = COALESCE(notification_count, 0) + 1,
            updated_at         = NOW()
      WHERE user_id_hash = $1`,
    [userIdHash]
  );
}

// ─────────────────────────────────────────────
//  PER-USER PROCESSING
// ─────────────────────────────────────────────

/**
 * Send a reminder email to a single user and update tracking on success.
 *
 * @param {Object} user                 - Row from queryUsersForReminder()
 * @param {string} currentTermsVersion
 * @param {string} currentPrivacyVersion
 * @param {Object} stats                - Mutable counters
 */
async function processUserReminder(user, currentTermsVersion, currentPrivacyVersion, stats) {
  const shortHash = user.user_id_hash.substring(0, 8) + '...';

  try {
    if (!user.email?.trim()) {
      stats.skipped++;
      return;
    }

    // Determine which documents have changed for this user
    const documentType = resolveDocumentType(
      user.user_terms_version,
      user.user_privacy_version,
      currentTermsVersion,
      currentPrivacyVersion
    );

    // Build a human-readable description based on which documents changed
    let description;
    if (documentType === 'both') {
      description = `We've updated both our Terms of Service (v${currentTermsVersion}) and Privacy Policy (v${currentPrivacyVersion}). Please log in to review and accept the changes.`;
    } else if (documentType === 'terms') {
      description = process.env.TERMS_CHANGE_DESCRIPTION
        || `We've updated our Terms of Service to v${currentTermsVersion}.`;
    } else {
      description = process.env.PRIVACY_CHANGE_DESCRIPTION
        || `We've updated our Privacy Policy to v${currentPrivacyVersion}.`;
    }

    // Send the reminder (isReminder = true)
    const result = await sendPolicyReminderEmail(
      user.email,
      user.user_id_hash,
      user.grace_period_end,
      documentType,
      description,
      true, // isReminder
      db
    );

    if (result.skipped) {
      // User opted out between query time and send time
      stats.skipped++;
      return;
    }

    if (!result.success) {
      logger.error(
        new Error(result.error),
        `Policy reminder email failed for ${shortHash}`
      );
      stats.failed++;
      return;
    }

    // Update tracking so we don't send this user another reminder
    await updateNotificationTracking(user.user_id_hash);
    stats.successful++;

  } catch (error) {
    logger.errorFromCatch(error, `processUserReminder ${shortHash}`);
    stats.failed++;
  }
}

// ─────────────────────────────────────────────
//  LAMBDA HANDLER
// ─────────────────────────────────────────────

/**
 * Lambda entry point — invoked by EventBridge daily at 3:00 AM UTC.
 *
 * @param {Object} event - EventBridge scheduled event
 * @returns {Object} HTTP-style response with run statistics
 */
export const handler = async (event) => {
  const startTime = Date.now();

  try {
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    const { termsVersion, privacyVersion } = getCurrentVersions();

    // Find users who need reminders
    const { rows } = await queryUsersForReminder(termsVersion, privacyVersion);

    const stats = {
      total:      rows.length,
      successful: 0,
      failed:     0,
      skipped:    0,
    };

    // Process each user
    for (const user of rows) {
      await processUserReminder(user, termsVersion, privacyVersion, stats);
    }

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stats,
        duration_ms: duration,
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.errorFromCatch(error, 'Lambda handler');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: duration,
      }),
    };
  }
};

export default { handler };
