/**
 * Account Cleanup Lambda Function
 *
 * Scheduled to run daily via EventBridge (0 2 * * * — 2:00 AM UTC).
 * Handles the full account deletion lifecycle in three phases:
 *
 *   Phase 1 – PII Anonymization (30 days after deletion request)
 *     Nulls out all encrypted PII columns in user_personal_info while
 *     preserving the row itself (user_id + email_hash).  The email_hash
 *     is computed from email_encrypted immediately before it is NULLed,
 *     so that legal lookup by email address remains possible even after
 *     the user's data has been anonymized.
 *     Status: pending_deletion → anonymized
 *
 *   Phase 2 – Final Deletion (7 years = 2,555 days after deletion request)
 *     Deletes all remaining data: chat messages and the user_personal_info
 *     row itself.  At this point the account is truly gone.
 *     Status: anonymized → (row deleted)
 *
 *   Phase 3 – Re-engagement emails (only for accounts still in pending_deletion)
 *     6-month (180–184 days) and 1-year (365–369 days) re-engagement emails
 *     are sent only while the account is still in pending_deletion status.
 *     Once Phase 1 runs at 30 days, the email is gone and these will never
 *     fire — which is the correct behaviour.
 *
 * Legal traceability after anonymization:
 *   Plaintiff's email → SHA-256(email) → email_hash → user_id
 *   → SHA-256(user_id) → user_id_hash → messages table
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';
import { sendReengagementEmail } from '../shared/emailService.js';
import crypto from 'crypto';

const logger       = createLogger('account-cleanup');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// ─────────────────────────────────────────────────────────────────
//  PHASE 1 — PII ANONYMIZATION  (30 days after deletion_requested_at)
// ─────────────────────────────────────────────────────────────────

/**
 * Find accounts whose anonymization_date has arrived (or is overdue) and
 * whose status is still 'pending_deletion', then NULL out every PII column
 * while keeping the row (user_id + email_hash) for legal traceability.
 *
 * Also removes child records that are no longer needed after anonymization:
 * 2FA codes/settings, consents, preferences, settings, audit_log rows.
 * Chat messages are NOT deleted here — they are retained until Phase 2.
 */
async function anonymizeExpiredAccounts() {
  try {
    const { rows } = await db.query(
      `SELECT user_id
         FROM user_personal_info
        WHERE deletion_status    = 'pending_deletion'
          AND anonymization_date IS NOT NULL
          AND anonymization_date <= NOW()`
    );

    let anonymizedCount = 0;

    for (const account of rows) {
      try {
        const userIdHash = crypto
          .createHash('sha256')
          .update(account.user_id)
          .digest('hex')
          .substring(0, 64);

        // ── Compute email_hash and NULL out every PII column ──────────────
        await db.query(
          `UPDATE user_personal_info
           SET
             -- Preserve email_hash computed from email_encrypted
             -- BEFORE we null the encrypted column.
             email_hash                       = COALESCE(
                                                  email_hash,
                                                  CASE WHEN email_encrypted IS NOT NULL
                                                       THEN encode(
                                                              digest(
                                                                pgp_sym_decrypt(email_encrypted, $2)::text,
                                                                'sha256'
                                                              ),
                                                              'hex'
                                                            )
                                                       ELSE NULL
                                                  END
                                                ),
             -- PII columns
             first_name_encrypted             = NULL,
             last_name_encrypted              = NULL,
             email_encrypted                  = NULL,
             phone_number_encrypted           = NULL,
             birth_date_encrypted             = NULL,
             birth_time_encrypted             = NULL,
             birth_city_encrypted             = NULL,
             birth_province_encrypted         = NULL,
             birth_country_encrypted          = NULL,
             birth_timezone_encrypted         = NULL,
             sex_encrypted                    = NULL,
             familiar_name_encrypted          = NULL,
             stripe_customer_id_encrypted     = NULL,
             stripe_subscription_id_encrypted = NULL,
             billing_country_encrypted        = NULL,
             billing_state_encrypted          = NULL,
             billing_city_encrypted           = NULL,
             billing_postal_code_encrypted    = NULL,
             billing_address_line1_encrypted  = NULL,
             -- Status
             deletion_status                  = 'anonymized',
             anonymization_date               = NOW(),
             updated_at                       = NOW()
           WHERE user_id = $1`,
          [account.user_id, ENCRYPTION_KEY]
        );

        // ── Remove child records no longer needed after anonymization ──────
        // (messages are retained for the 7-year legal hold — see Phase 2)
        await db.query(
          `DELETE FROM user_2fa_codes     WHERE user_id_hash = $1`, [userIdHash]);
        await db.query(
          `DELETE FROM user_2fa_settings  WHERE user_id_hash = $1`, [userIdHash]);
        await db.query(
          `DELETE FROM user_consents      WHERE user_id_hash = $1`, [userIdHash]);
        await db.query(
          `DELETE FROM user_preferences   WHERE user_id_hash = $1`, [userIdHash]);
        await db.query(
          `DELETE FROM user_settings      WHERE user_id_hash = $1`, [userIdHash]);
        await db.query(
          `DELETE FROM astrology_readings WHERE user_id = $1`,       [account.user_id]);

        // ── Audit ─────────────────────────────────────────────────────────
        await db.query(
          `INSERT INTO account_deletion_audit
             (user_id_hash, deletion_reason, created_at)
           VALUES ($1, $2, NOW())`,
          [
            userIdHash,
            JSON.stringify({
              action:      'PII_ANONYMIZED',
              triggered_by: 'account-cleanup-lambda-phase-1',
              note:        'All PII NULLed; email_hash and messages retained for legal hold.'
            })
          ]
        );

        anonymizedCount++;
        logger.info?.(`Phase 1: anonymized account ${account.user_id.substring(0, 8)}…`);
      } catch (e) {
        logger.errorFromCatch(e, 'Phase 1 anonymization', account.user_id);
      }
    }

    return anonymizedCount;
  } catch (error) {
    logger.errorFromCatch(error, 'anonymizeExpiredAccounts');
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────
//  PHASE 2 — FINAL DELETION  (7 years = 2,555 days)
// ─────────────────────────────────────────────────────────────────

/**
 * Permanently delete accounts that have reached their 7-year final_deletion_date.
 * At this point:
 *   • All PII was already NULLed out in Phase 1 (30 days ago or more)
 *   • The only remaining data is the anonymized user_personal_info row
 *     and the chat messages in the messages table.
 *
 * After this runs there is truly nothing left except the deletion audit trail.
 */
async function permanentlyDeleteOldAccounts() {
  try {
    const { rows } = await db.query(
      `SELECT user_id
         FROM user_personal_info
        WHERE deletion_status  = 'anonymized'
          AND final_deletion_date IS NOT NULL
          AND final_deletion_date <= NOW()`
    );

    let deletedCount = 0;

    for (const account of rows) {
      try {
        const userIdHash = crypto
          .createHash('sha256')
          .update(account.user_id)
          .digest('hex')
          .substring(0, 64);

        // ── Delete chat messages (7-year legal hold now expired) ──────────
        await db.query(
          `DELETE FROM messages WHERE user_id_hash = $1`,
          [userIdHash]
        );

        // ── Delete the anonymized user_personal_info row itself ───────────
        await db.query(
          `DELETE FROM user_personal_info WHERE user_id = $1`,
          [account.user_id]
        );

        // ── Final audit entry ─────────────────────────────────────────────
        await db.query(
          `INSERT INTO account_deletion_audit
             (user_id_hash, deletion_reason, created_at)
           VALUES ($1, $2, NOW())`,
          [
            userIdHash,
            JSON.stringify({
              action:       'PERMANENTLY_DELETED',
              triggered_by: 'account-cleanup-lambda-phase-2',
              note:         '7-year legal retention period expired; all data deleted.'
            })
          ]
        );

        deletedCount++;
        logger.info?.(`Phase 2: permanently deleted account ${account.user_id.substring(0, 8)}…`);
      } catch (e) {
        logger.errorFromCatch(e, 'Phase 2 permanent deletion', account.user_id);
      }
    }

    return deletedCount;
  } catch (error) {
    logger.errorFromCatch(error, 'permanentlyDeleteOldAccounts');
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────
//  PHASE 3a — 6-MONTH RE-ENGAGEMENT EMAIL
// ─────────────────────────────────────────────────────────────────

/**
 * Find accounts that are 180–184 days past deletion request and haven't yet
 * received a 6-month re-engagement email.
 *
 * NOTE: After Phase 1 runs at 30 days, deletion_status becomes 'anonymized'
 * and email_encrypted is NULLed, so this query (which requires
 * deletion_status = 'pending_deletion' and a decryptable email) will never
 * match those accounts.  This function is retained for the edge case where
 * the Lambda missed a scheduled run and an account is still pending at 6 months.
 *
 * Excludes:
 *   • Accounts that unsubscribed (reengagement_email_unsub = TRUE)
 *   • Users who opted out of marketing emails (email_marketing_enabled = false)
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
         AND upi.email_encrypted IS NOT NULL
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

        if (result.skipped) { stats.skipped++; continue; }

        if (!result.success) {
          logger.error(
            new Error(result.error),
            '6-month reengagement email failed',
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
            '6_month',
            result.messageId,
            JSON.stringify({ sent_at: new Date().toISOString() }),
          ]
        );

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

// ─────────────────────────────────────────────────────────────────
//  PHASE 3b — 1-YEAR RE-ENGAGEMENT EMAIL
// ─────────────────────────────────────────────────────────────────

/**
 * Find accounts 365–369 days past deletion request that haven't yet received
 * a 1-year re-engagement email.  Same opt-out exclusions and Phase-1 caveat
 * as the 6-month function above.
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
         AND upi.email_encrypted IS NOT NULL
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

        if (result.skipped) { stats.skipped++; continue; }

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

// ─────────────────────────────────────────────────────────────────
//  LAMBDA HANDLER
// ─────────────────────────────────────────────────────────────────

/**
 * Lambda entry point — invoked by EventBridge on the daily schedule.
 *
 * Execution order:
 *   1. Phase 1  – Anonymize PII for accounts 30+ days past deletion request
 *   2. Phase 2  – Permanently delete accounts 7+ years past deletion request
 *   3. Phase 3a – Send 6-month re-engagement emails (pending_deletion only)
 *   4. Phase 3b – Send 1-year re-engagement emails  (pending_deletion only)
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

    const anonymized = await anonymizeExpiredAccounts();
    const deleted    = await permanentlyDeleteOldAccounts();
    const stats6m    = await send6MonthReengagementEmails();
    const stats1y    = await send1YearReengagementEmails();

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        phase1_anonymized:  anonymized,
        phase2_deleted:     deleted,
        reengagement_6m:    stats6m,
        reengagement_1y:    stats1y,
        duration_ms:        duration,
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.errorFromCatch(error, 'Lambda handler');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success:     false,
        error:       error.message,
        duration_ms: duration,
      }),
    };
  }
};

export default { handler };
