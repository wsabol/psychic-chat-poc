/**
 * Account Cleanup Lambda Function
 *
 * Scheduled to run daily via EventBridge (0 2 * * * — 2:00 AM UTC).
 * Handles the account deletion lifecycle:
 *   1. Sends 6-month re-engagement email  (180–184 days after deletion request)
 *   2. Sends 1-year re-engagement email   (365–369 days after deletion request)
 *   3. Permanently deletes data after 7 years (2,555+ days)
 *
 * Email opt-out:
 *   Both the SQL query (reengagement_email_unsub = FALSE) and
 *   user_settings.email_marketing_enabled are checked before sending.
 *   Users who have opted out via either mechanism are silently skipped.
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';
import { sendReengagementEmail } from '../shared/emailService.js';

const logger      = createLogger('account-cleanup');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// ─────────────────────────────────────────────
//  6-MONTH RE-ENGAGEMENT
// ─────────────────────────────────────────────

/**
 * Find accounts that are 180–184 days past deletion request and haven't yet
 * received a 6-month re-engagement email.  Excludes:
 *   • Accounts that explicitly unsubscribed (reengagement_email_unsub = TRUE)
 *   • Users who opted out of all emails (user_settings.email_marketing_enabled = false)
 */
async function send6MonthReengagementEmails() {
  try {
    const { rows } = await db.query(
      `SELECT
         upi.user_id,
         pgp_sym_decrypt(upi.email_encrypted, $1) AS email,
         encode(digest(upi.user_id, 'sha256'), 'hex') AS user_id_hash
       FROM user_personal_info upi
       LEFT JOIN user_settings us
              ON us.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
       WHERE upi.deletion_status = 'pending_deletion'
         AND upi.deletion_requested_at IS NOT NULL
         AND upi.reengagement_email_6m_sent_at IS NULL
         AND upi.reengagement_email_unsub = FALSE
         AND COALESCE(us.email_marketing_enabled, true) = true
         AND (CURRENT_DATE - upi.deletion_requested_at::DATE) >= 180
         AND (CURRENT_DATE - upi.deletion_requested_at::DATE) < 185`,
      [ENCRYPTION_KEY]
    );

    const stats = { sent: 0, skipped: 0, failed: 0 };

    for (const account of rows) {
      try {
        const result = await sendReengagementEmail(
          account.email,
          account.user_id,
          account.user_id_hash,
          '6_month',
          db
        );

        if (result.skipped) {
          stats.skipped++;
          continue;
        }

        if (!result.success) {
          logger.error(
            new Error(result.error),
            '6-month reengagement email failed',
            account.user_id
          );
          stats.failed++;
          continue;
        }

        // Record the send in the audit table
        await db.query(
          `INSERT INTO account_reengagement_emails
             (user_id, email_type, sent_at, message_id, details)
           VALUES ($1, $2, NOW(), $3, $4)`,
          [
            account.user_id,
            '6_month',
            result.messageId,
            JSON.stringify({ sent_at: new Date().toISOString() }),
          ]
        );

        // Update the tracking column so we never double-send
        await db.query(
          `UPDATE user_personal_info
              SET reengagement_email_6m_sent_at  = NOW(),
                  last_reengagement_email_sent_at = NOW(),
                  updated_at                      = NOW()
            WHERE user_id = $1`,
          [account.user_id]
        );

        stats.sent++;
      } catch (e) {
        logger.errorFromCatch(e, '6-month reengagement email', account.user_id);
        stats.failed++;
      }
    }

    return stats;
  } catch (error) {
    logger.errorFromCatch(error, 'send6MonthReengagementEmails');
    return { sent: 0, skipped: 0, failed: 0 };
  }
}

// ─────────────────────────────────────────────
//  1-YEAR RE-ENGAGEMENT
// ─────────────────────────────────────────────

/**
 * Find accounts 365–369 days past deletion request that haven't yet received
 * a 1-year re-engagement email.  Same opt-out exclusions as above.
 */
async function send1YearReengagementEmails() {
  try {
    const { rows } = await db.query(
      `SELECT
         upi.user_id,
         pgp_sym_decrypt(upi.email_encrypted, $1) AS email,
         encode(digest(upi.user_id, 'sha256'), 'hex') AS user_id_hash
       FROM user_personal_info upi
       LEFT JOIN user_settings us
              ON us.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
       WHERE upi.deletion_status = 'pending_deletion'
         AND upi.deletion_requested_at IS NOT NULL
         AND upi.reengagement_email_1y_sent_at IS NULL
         AND upi.reengagement_email_unsub = FALSE
         AND COALESCE(us.email_marketing_enabled, true) = true
         AND (CURRENT_DATE - upi.deletion_requested_at::DATE) >= 365
         AND (CURRENT_DATE - upi.deletion_requested_at::DATE) < 370`,
      [ENCRYPTION_KEY]
    );

    const stats = { sent: 0, skipped: 0, failed: 0 };

    for (const account of rows) {
      try {
        const result = await sendReengagementEmail(
          account.email,
          account.user_id,
          account.user_id_hash,
          '1_year',
          db
        );

        if (result.skipped) {
          stats.skipped++;
          continue;
        }

        if (!result.success) {
          logger.error(
            new Error(result.error),
            '1-year reengagement email failed',
            account.user_id
          );
          stats.failed++;
          continue;
        }

        await db.query(
          `INSERT INTO account_reengagement_emails
             (user_id, email_type, sent_at, message_id, details)
           VALUES ($1, $2, NOW(), $3, $4)`,
          [
            account.user_id,
            '1_year',
            result.messageId,
            JSON.stringify({ sent_at: new Date().toISOString() }),
          ]
        );

        await db.query(
          `UPDATE user_personal_info
              SET reengagement_email_1y_sent_at   = NOW(),
                  last_reengagement_email_sent_at  = NOW(),
                  updated_at                       = NOW()
            WHERE user_id = $1`,
          [account.user_id]
        );

        stats.sent++;
      } catch (e) {
        logger.errorFromCatch(e, '1-year reengagement email', account.user_id);
        stats.failed++;
      }
    }

    return stats;
  } catch (error) {
    logger.errorFromCatch(error, 'send1YearReengagementEmails');
    return { sent: 0, skipped: 0, failed: 0 };
  }
}

// ─────────────────────────────────────────────
//  7-YEAR PERMANENT DELETION
// ─────────────────────────────────────────────

/**
 * Permanently delete accounts that are 7+ years (2,555 days) past their
 * deletion request.  Data is retained in full for 7 years to comply with
 * most statute-of-limitations periods; after that it is purged.
 */
async function permanentlyDeleteOldAccounts() {
  try {
    const { rows } = await db.query(
      `SELECT user_id
         FROM user_personal_info
        WHERE deletion_status = 'pending_deletion'
          AND deletion_requested_at IS NOT NULL
          AND (CURRENT_DATE - deletion_requested_at::DATE) >= 2555`
    );

    let deletedCount = 0;

    for (const account of rows) {
      try {
        // Delete child records first
        await db.query('DELETE FROM messages               WHERE user_id = $1', [account.user_id]);
        await db.query('DELETE FROM astrology_readings     WHERE user_id = $1', [account.user_id]);
        await db.query('DELETE FROM user_consents          WHERE user_id = $1', [account.user_id]);
        await db.query('DELETE FROM account_reengagement_emails WHERE user_id = $1', [account.user_id]);

        // Mark the parent record as permanently deleted
        await db.query(
          `UPDATE user_personal_info
              SET deletion_status    = 'deleted',
                  final_deletion_date = NOW(),
                  updated_at         = NOW()
            WHERE user_id = $1`,
          [account.user_id]
        );

        // Audit trail
        await db.query(
          `INSERT INTO account_deletion_audit
             (user_id, action, action_timestamp, details)
           VALUES ($1, $2, NOW(), $3)`,
          [
            account.user_id,
            'PERMANENTLY_DELETED',
            JSON.stringify({ deleted_after_7_years: true }),
          ]
        );

        deletedCount++;
      } catch (e) {
        logger.errorFromCatch(e, 'Permanent account deletion', account.user_id);
      }
    }

    return deletedCount;
  } catch (error) {
    logger.errorFromCatch(error, 'permanentlyDeleteOldAccounts');
    return 0;
  }
}

// ─────────────────────────────────────────────
//  LAMBDA HANDLER
// ─────────────────────────────────────────────

/**
 * Lambda entry point — invoked by EventBridge on the schedule above.
 *
 * @param {Object} event - EventBridge scheduled event (contents not used)
 * @returns {Object} HTTP-style response with execution summary
 */
export const handler = async (event) => {
  const startTime = Date.now();

  try {
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Run all three tasks sequentially
    const stats6m  = await send6MonthReengagementEmails();
    const stats1y  = await send1YearReengagementEmails();
    const deleted  = await permanentlyDeleteOldAccounts();

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        reengagement_6m: stats6m,
        reengagement_1y: stats1y,
        permanent_deletions: deleted,
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
