/**
 * Policy Change Notification Job
 * 
 * Sends email notifications to users when Terms of Service or Privacy Policy are updated
 * Implements a 30-day grace period with reminder notifications at 21 days (9 days before deadline)
 * 
 * Job Responsibilities:
 * 1. Send initial notifications when policy versions change
 * 2. Send reminder notifications 21 days after initial notification (9 days before deadline)
 * 3. Set grace period deadline (30 days from first notification)
 * 4. Track notification status (last_notified_at, notification_count)
 */

import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import { sendPolicyChangeNotification } from '../shared/emailService.js';
import { getCurrentTermsVersion, getCurrentPrivacyVersion } from '../shared/versionConfig.js';
import VERSION_CONFIG from '../shared/versionConfig.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { logAudit } from '../shared/auditLog.js';

// Job status tracking
let lastRunTime = null;
let lastRunResult = null;

/**
 * Send initial policy change notifications
 * Called when admin triggers notification after updating .env versions
 * Sets 30-day grace period deadline
 */
export async function sendInitialPolicyNotifications() {
  const startTime = new Date();
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: [],
    gracePeriodEnd: null
  };

  try {
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();
    
    // Calculate 30-day grace period deadline
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);
    results.gracePeriodEnd = gracePeriodEnd;

    // Determine which document(s) changed
    let documentType = 'both';
    let changeDescription = '';
    
    if (VERSION_CONFIG.terms.changeType === 'MAJOR' && VERSION_CONFIG.privacy.changeType === 'MAJOR') {
      documentType = 'both';
      changeDescription = `We've updated both our Terms of Service (v${currentTermsVersion}) and Privacy Policy (v${currentPrivacyVersion}) to better serve you and maintain compliance.`;
    } else if (VERSION_CONFIG.terms.changeType === 'MAJOR') {
      documentType = 'terms';
      changeDescription = VERSION_CONFIG.terms.description || `We've updated our Terms of Service to v${currentTermsVersion}.`;
    } else if (VERSION_CONFIG.privacy.changeType === 'MAJOR') {
      documentType = 'privacy';
      changeDescription = VERSION_CONFIG.privacy.description || `We've updated our Privacy Policy to v${currentPrivacyVersion}.`;
    } else {
      return { ...results, skipped: true };
    }

    // Get users who need to be notified
    // Users with outdated versions and either no notification sent or more than 30 days old (for re-notifications)
    // IMPORTANT: Exclude temporary users (user_id starts with 'temp_')
    const usersQuery = await db.query(`
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
      INNER JOIN user_personal_info upi ON uc.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
      WHERE (
        uc.terms_version != $1 OR 
        uc.privacy_version != $2
      )
      AND uc.requires_consent_update = true
      AND (
        uc.last_notified_at IS NULL OR
        uc.last_notified_at < NOW() - INTERVAL '30 days'
      )
      AND upi.email_encrypted IS NOT NULL
      AND upi.subscription_status = 'active'
      AND upi.user_id NOT LIKE 'temp_%'
      AND upi.deletion_requested_at IS NULL
      ORDER BY uc.last_notified_at ASC NULLS FIRST
      LIMIT 1000
    `, [currentTermsVersion, currentPrivacyVersion, process.env.ENCRYPTION_KEY]);

    results.total = usersQuery.rows.length;
    // Send notification to each user
    for (const user of usersQuery.rows) {
      try {
        const userEmail = user.email;
        
        if (!userEmail || userEmail.trim() === '') {
          console.warn(`[Policy Notification Job] Skipping user with no email: ${user.user_id_hash.substring(0, 8)}...`);
          results.failed++;
          continue;
        }

        // Prepare change information
        const changeInfo = {
          documentType,
          version: documentType === 'both' ? `${currentTermsVersion}/${currentPrivacyVersion}` : 
                   documentType === 'terms' ? currentTermsVersion : currentPrivacyVersion,
          changeType: 'MAJOR',
          description: changeDescription,
          gracePeriodEnd
        };

        // Send email
        const emailResult = await sendPolicyChangeNotification(userEmail, changeInfo, false);

        if (emailResult.success) {
          // Update user_consents with notification tracking and grace period
          await db.query(`
            UPDATE user_consents
            SET 
              last_notified_at = NOW(),
              notification_count = COALESCE(notification_count, 0) + 1,
              grace_period_end = $2,
              updated_at = NOW()
            WHERE user_id_hash = $1
          `, [user.user_id_hash, gracePeriodEnd]);

          results.successful++;
        } else {
          results.failed++;
          results.errors.push({ user: user.user_id_hash.substring(0, 8), error: emailResult.error });
          console.error(`[Policy Notification Job] ✗ Failed to send to user ${user.user_id_hash.substring(0, 8)}...: ${emailResult.error}`);
        }

        // Rate limiting: small delay between emails to avoid overwhelming SendGrid
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        results.errors.push({ user: user.user_id_hash.substring(0, 8), error: error.message });
        console.error(`[Policy Notification Job] Error processing user ${user.user_id_hash.substring(0, 8)}...:`, error.message);
        logErrorFromCatch(error, 'job', 'policy_notification');
      }
    }

    const duration = new Date() - startTime;

    lastRunTime = startTime;
    lastRunResult = results;

    return results;

  } catch (error) {
    console.error('[Policy Notification Job] Fatal error:', error.message);
    logErrorFromCatch(error, 'job', 'policy_notification_initial');
    throw error;
  }
}

/**
 * Send reminder notifications
 * Called 21 days after initial notification (9 days before 30-day deadline)
 * Only sends to users who haven't accepted yet
 */
export async function sendReminderNotifications() {
  const startTime = new Date();
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: []
  };

  try {
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();

    // Determine document type
    let documentType = 'both';
    let changeDescription = '';
    
    if (VERSION_CONFIG.terms.changeType === 'MAJOR' && VERSION_CONFIG.privacy.changeType === 'MAJOR') {
      documentType = 'both';
      changeDescription = `Reminder: Please review and accept our updated Terms of Service (v${currentTermsVersion}) and Privacy Policy (v${currentPrivacyVersion}).`;
    } else if (VERSION_CONFIG.terms.changeType === 'MAJOR') {
      documentType = 'terms';
      changeDescription = VERSION_CONFIG.terms.description || `Reminder: Please review and accept our updated Terms of Service (v${currentTermsVersion}).`;
    } else if (VERSION_CONFIG.privacy.changeType === 'MAJOR') {
      documentType = 'privacy';
      changeDescription = VERSION_CONFIG.privacy.description || `Reminder: Please review and accept our updated Privacy Policy (v${currentPrivacyVersion}).`;
    }

    // Get users who:
    // 1. Were notified 21+ days ago (grace period ends in ~9 days)
    // 2. Still have outdated versions (haven't accepted yet)
    // 3. Haven't received more than 2 notifications (initial + 1 reminder max)
    // 4. Are real users (not temporary)
    const usersQuery = await db.query(`
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
      INNER JOIN user_personal_info upi ON uc.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
      WHERE (
        uc.terms_version != $1 OR 
        uc.privacy_version != $2
      )
      AND uc.requires_consent_update = true
      AND uc.last_notified_at IS NOT NULL
      AND uc.last_notified_at <= NOW() - INTERVAL '21 days'
      AND uc.last_notified_at > NOW() - INTERVAL '22 days'
      AND COALESCE(uc.notification_count, 0) < 2
      AND upi.email_encrypted IS NOT NULL
      AND upi.subscription_status = 'active'
      AND upi.user_id NOT LIKE 'temp_%'
      AND upi.deletion_requested_at IS NULL
      ORDER BY uc.last_notified_at ASC
      LIMIT 1000
    `, [currentTermsVersion, currentPrivacyVersion, process.env.ENCRYPTION_KEY]);

    results.total = usersQuery.rows.length;
    // Send reminder to each user
    for (const user of usersQuery.rows) {
      try {
        const userEmail = user.email;
        
        if (!userEmail || userEmail.trim() === '') {
          console.warn(`[Policy Notification Job] Skipping user with no email: ${user.user_id_hash.substring(0, 8)}...`);
          results.failed++;
          continue;
        }

        // Prepare change information
        const changeInfo = {
          documentType,
          version: documentType === 'both' ? `${currentTermsVersion}/${currentPrivacyVersion}` : 
                   documentType === 'terms' ? currentTermsVersion : currentPrivacyVersion,
          changeType: 'MAJOR',
          description: changeDescription,
          gracePeriodEnd: user.grace_period_end || new Date(Date.now() + 9 * 24 * 60 * 60 * 1000) // Fallback: 9 days from now
        };

        // Send reminder email
        const emailResult = await sendPolicyChangeNotification(userEmail, changeInfo, true);

        if (emailResult.success) {
          // Update notification tracking
          await db.query(`
            UPDATE user_consents
            SET 
              notification_count = COALESCE(notification_count, 0) + 1,
              updated_at = NOW()
            WHERE user_id_hash = $1
          `, [user.user_id_hash]);

          results.successful++;
        } else {
          results.failed++;
          results.errors.push({ user: user.user_id_hash.substring(0, 8), error: emailResult.error });
          console.error(`[Policy Notification Job] ✗ Failed to send reminder to user ${user.user_id_hash.substring(0, 8)}...: ${emailResult.error}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        results.errors.push({ user: user.user_id_hash.substring(0, 8), error: error.message });
        console.error(`[Policy Notification Job] Error processing reminder for user ${user.user_id_hash.substring(0, 8)}...:`, error.message);
        logErrorFromCatch(error, 'job', 'policy_notification_reminder');
      }
    }

    const duration = new Date() - startTime;
    return results;
  } catch (error) {
    console.error('[Policy Notification Job] Fatal error in reminder job:', error.message);
    logErrorFromCatch(error, 'job', 'policy_notification_reminder');
    throw error;
  }
}

/**
 * Auto-logout users who haven't accepted after grace period expires
 * Invalidates sessions for non-compliant users past the 30-day deadline
 */
export async function enforceGracePeriodExpiration() {
  const startTime = new Date();
  const results = {
    total: 0,
    sessionsInvalidated: 0,
    errors: []
  };

  try {
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();

    // Find users whose grace period has expired and still haven't accepted
    const expiredUsersQuery = await db.query(`
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
    `, [currentTermsVersion, currentPrivacyVersion]);

    results.total = expiredUsersQuery.rows.length;
    // Invalidate sessions for expired users
    for (const user of expiredUsersQuery.rows) {
      try {
        // Delete active sessions to force logout
        const sessionResult = await db.query(`
          DELETE FROM user_sessions
          WHERE user_id_hash = $1
        `, [user.user_id_hash]);

        if (sessionResult.rowCount > 0) {
          results.sessionsInvalidated += sessionResult.rowCount;
        }

      } catch (error) {
        results.errors.push({ user: user.user_id_hash.substring(0, 8), error: error.message });
        console.error(`[Policy Notification Job] Error invalidating sessions for user ${user.user_id_hash.substring(0, 8)}...:`, error.message);
        logErrorFromCatch(error, 'job', 'grace_period_enforcement');
      }
    }

    const duration = new Date() - startTime;
    return results;
  } catch (error) {
    console.error('[Policy Notification Job] Fatal error in grace period enforcement:', error.message);
    logErrorFromCatch(error, 'job', 'grace_period_enforcement');
    throw error;
  }
}

/**
 * Get job status
 */
export function getPolicyNotificationJobStatus() {
  return {
    lastRun: lastRunTime,
    lastResult: lastRunResult,
    status: 'active'
  };
}

export default {
  sendInitialPolicyNotifications,
  sendReminderNotifications,
  enforceGracePeriodExpiration,
  getPolicyNotificationJobStatus
};
