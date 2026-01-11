/**
 * Account Cleanup Job
 * Scheduled task to handle account deletion lifecycle
 * 
 * Legal Compliance: Data retention for 7 years to comply with statute of limitations
 * No anonymization - data retained in original form for legal investigation
 * Re-engagement emails at 6 months and 1 year with unsubscribe option
 */

import { db } from '../shared/db.js';
import { sendAccountReengagementEmail } from '../shared/emailService.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * Main cleanup job - runs daily
 */
export async function runAccountCleanupJob() {
  try {
    const results = {
      reengagement_6m_sent: 0,
      reengagement_1y_sent: 0,
      permanent_deletions: 0
    };

    const result6m = await send6MonthReengagementEmails();
    results.reengagement_6m_sent = result6m;

    const result1y = await send1YearReengagementEmails();
    results.reengagement_1y_sent = result1y;

    const resultDelete = await permanentlyDeleteOldAccounts();
    results.permanent_deletions = resultDelete;

    return { success: true, ...results };

  } catch (error) {
    console.error('[CLEANUP-JOB] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send 6-month re-engagement emails to deleted accounts
 * Allows users to reactivate their account within a re-engagement window
 */
async function send6MonthReengagementEmails() {
  try {
    const result = await db.query(
      `SELECT user_id, pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info 
       WHERE deletion_status = 'pending_deletion'
         AND deletion_requested_at IS NOT NULL
         AND reengagement_email_6m_sent_at IS NULL
         AND reengagement_email_unsub = FALSE
         AND (CURRENT_DATE - deletion_requested_at::DATE) >= 180
         AND (CURRENT_DATE - deletion_requested_at::DATE) < 185`,
      [ENCRYPTION_KEY]
    );

    let emailsSent = 0;
    for (const account of result.rows) {
      try {
        const emailSendResult = await sendAccountReengagementEmail(
          account.email,
          account.user_id,
          '6_month'
        );

        if (emailSendResult.success) {
          // Log the email sent and update tracking
          await db.query(
            `INSERT INTO account_reengagement_emails 
             (user_id, email_type, sent_at, message_id, details)
             VALUES ($1, $2, NOW(), $3, $4)`,
            [
              account.user_id,
              '6_month',
              emailSendResult.messageId,
              JSON.stringify({ sent_at: new Date().toISOString() })
            ]
          );

          await db.query(
            `UPDATE user_personal_info
             SET reengagement_email_6m_sent_at = NOW(),
                 last_reengagement_email_sent_at = NOW(),
                 updated_at = NOW()
             WHERE user_id = $1`,
            [account.user_id]
          );

          emailsSent++;
        } else {
          console.error(`[REENGAGEMENT-6M] ❌ Failed to send to ${account.user_id}: ${emailSendResult.error}`);
        }
      } catch (e) {
        console.error(`[REENGAGEMENT-6M] ❌ ${account.user_id}:`, e.message);
      }
    }
    return emailsSent;
  } catch (error) {
    console.error('[REENGAGEMENT-6M] Error:', error);
    return 0;
  }
}

/**
 * Send 1-year re-engagement emails to deleted accounts
 * Second attempt to re-engage users after one year
 */
async function send1YearReengagementEmails() {
  try {
    const result = await db.query(
      `SELECT user_id, pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info 
       WHERE deletion_status = 'pending_deletion'
         AND deletion_requested_at IS NOT NULL
         AND reengagement_email_1y_sent_at IS NULL
         AND reengagement_email_unsub = FALSE
         AND (CURRENT_DATE - deletion_requested_at::DATE) >= 365
         AND (CURRENT_DATE - deletion_requested_at::DATE) < 370`,
      [ENCRYPTION_KEY]
    );

    let emailsSent = 0;
    for (const account of result.rows) {
      try {
        const emailSendResult = await sendAccountReengagementEmail(
          account.email,
          account.user_id,
          '1_year'
        );

        if (emailSendResult.success) {
          // Log the email sent and update tracking
          await db.query(
            `INSERT INTO account_reengagement_emails 
             (user_id, email_type, sent_at, message_id, details)
             VALUES ($1, $2, NOW(), $3, $4)`,
            [
              account.user_id,
              '1_year',
              emailSendResult.messageId,
              JSON.stringify({ sent_at: new Date().toISOString() })
            ]
          );

          await db.query(
            `UPDATE user_personal_info
             SET reengagement_email_1y_sent_at = NOW(),
                 last_reengagement_email_sent_at = NOW(),
                 updated_at = NOW()
             WHERE user_id = $1`,
            [account.user_id]
          );

          emailsSent++;
        } else {
          console.error(`[REENGAGEMENT-1Y] ❌ Failed to send to ${account.user_id}: ${emailSendResult.error}`);
        }
      } catch (e) {
        console.error(`[REENGAGEMENT-1Y] ❌ ${account.user_id}:`, e.message);
      }
    }
    return emailsSent;
  } catch (error) {
    console.error('[REENGAGEMENT-1Y] Error:', error);
    return 0;
  }
}

/**
 * Permanently delete accounts that are 7 years past deletion request
 * This aligns with most statute of limitations periods (2555 days = 7 years)
 * Data is retained in non-anonymized form for legal investigation
 */
async function permanentlyDeleteOldAccounts() {
  try {
    const result = await db.query(
      `SELECT user_id FROM user_personal_info 
       WHERE deletion_status = 'pending_deletion'
         AND deletion_requested_at IS NOT NULL
         AND (CURRENT_DATE - deletion_requested_at::DATE) >= 2555`
    );

    let deletedCount = 0;
    for (const account of result.rows) {
      try {
        // Delete related data
        await db.query('DELETE FROM messages WHERE user_id = $1', [account.user_id]);
        await db.query('DELETE FROM astrology_readings WHERE user_id = $1', [account.user_id]);
        await db.query('DELETE FROM user_consents WHERE user_id = $1', [account.user_id]);
        await db.query('DELETE FROM account_reengagement_emails WHERE user_id = $1', [account.user_id]);
        
        // Mark as deleted and audit
        await db.query(
          `UPDATE user_personal_info 
           SET deletion_status = 'deleted',
               final_deletion_date = NOW(),
               updated_at = NOW()
           WHERE user_id = $1`,
          [account.user_id]
        );

        // Log in audit trail
        await db.query(
          `INSERT INTO account_deletion_audit 
           (user_id, action, action_timestamp, details)
           VALUES ($1, $2, NOW(), $3)`,
          [account.user_id, 'PERMANENTLY_DELETED', JSON.stringify({ deleted_after_7_years: true })]
        );

        deletedCount++;

      } catch (e) {
        console.error(`[PERMANENT-DELETE] ❌ ${account.user_id}:`, e.message);
      }
    }
    return deletedCount;
  } catch (error) {
    console.error('[PERMANENT-DELETE] Error:', error);
    return 0;
  }
}

/**
 * Get cleanup job status
 */
export async function getCleanupJobStatus() {
  try {
    const stats = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM user_personal_info WHERE deletion_status = 'pending_deletion') as pending,
        (SELECT COUNT(*) FROM user_personal_info WHERE deletion_status = 'deleted') as deleted,
        (SELECT COUNT(*) FROM account_reengagement_emails WHERE email_type = '6_month') as emails_6m_sent,
        (SELECT COUNT(*) FROM account_reengagement_emails WHERE email_type = '1_year') as emails_1y_sent
      `
    );
    return stats.rows[0];
  } catch (error) {
    console.error('[CLEANUP-STATUS] Error:', error);
    return null;
  }
}

/**
 * Reactivate a deleted account via re-engagement email link
 * Called when user clicks "reactivate account" in re-engagement email
 */
export async function reactivateAccountFromReengagement(userId) {
  try {
    const result = await db.query(
      `UPDATE user_personal_info
       SET deletion_status = 'active',
           deletion_requested_at = NULL,
           reengagement_email_unsub = FALSE,
           updated_at = NOW()
       WHERE user_id = $1 AND deletion_status = 'pending_deletion'
       RETURNING user_id`,
      [userId]
    );

    if (result.rows.length > 0) {
      // Log the reactivation
      await db.query(
        `INSERT INTO account_deletion_audit 
         (user_id, action, action_timestamp, details)
         VALUES ($1, $2, NOW(), $3)`,
        [userId, 'REACTIVATED', JSON.stringify({ via_reengagement: true })]
      );

      // Update reengagement email log
      await db.query(
        `UPDATE account_reengagement_emails
         SET reactivated = TRUE, reactivated_at = NOW()
         WHERE user_id = $1 AND reactivated = FALSE`,
        [userId]
      );

      return { success: true, message: 'Account successfully reactivated' };
    } else {
      return { success: false, message: 'Account not found or not in deletion status' };
    }
  } catch (error) {
    console.error('[REACTIVATION] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe from re-engagement emails
 */
export async function unsubscribeFromReengagementEmails(userId) {
  try {
    await db.query(
      `UPDATE user_personal_info
       SET reengagement_email_unsub = TRUE,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    await db.query(
      `UPDATE account_reengagement_emails
       SET unsubscribed = TRUE
       WHERE user_id = $1 AND unsubscribed = FALSE`,
      [userId]
    );

    return { success: true, message: 'You have been unsubscribed from re-engagement emails' };
  } catch (error) {
    console.error('[UNSUBSCRIBE] Error:', error);
    return { success: false, error: error.message };
  }
}

export default { runAccountCleanupJob, getCleanupJobStatus, reactivateAccountFromReengagement, unsubscribeFromReengagementEmails };

