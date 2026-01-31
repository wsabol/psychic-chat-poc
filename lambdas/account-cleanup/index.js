/**
 * Account Cleanup Lambda Function
 * 
 * Scheduled to run daily via EventBridge
 * Handles account deletion lifecycle:
 * - Sends 6-month re-engagement emails
 * - Sends 1-year re-engagement emails
 * - Permanently deletes accounts after 7 years
 * 
 * Schedule: 0 2 * * * (daily at 2:00 AM UTC)
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';

const logger = createLogger('account-cleanup');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Send 6-month re-engagement emails to deleted accounts
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
        // TODO: Implement email sending via SES or SNS
        
        // Log the email sent and update tracking
        await db.query(
          `INSERT INTO account_reengagement_emails 
           (user_id, email_type, sent_at, details)
           VALUES ($1, $2, NOW(), $3)`,
          [
            account.user_id,
            '6_month',
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
      } catch (e) {
        logger.errorFromCatch(e, '6-month reengagement email', account.user_id);
      }
    }
    
    return emailsSent;
  } catch (error) {
    logger.errorFromCatch(error, 'Send 6-month reengagement emails');
    return 0;
  }
}

/**
 * Send 1-year re-engagement emails to deleted accounts
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
        // TODO: Implement email sending via SES or SNS
        
        // Log the email sent and update tracking
        await db.query(
          `INSERT INTO account_reengagement_emails 
           (user_id, email_type, sent_at, details)
           VALUES ($1, $2, NOW(), $3)`,
          [
            account.user_id,
            '1_year',
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
      } catch (e) {
        logger.errorFromCatch(e, '1-year reengagement email', account.user_id);
      }
    }
    
    return emailsSent;
  } catch (error) {
    logger.errorFromCatch(error, 'Send 1-year reengagement emails');
    return 0;
  }
}

/**
 * Permanently delete accounts that are 7 years past deletion request
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
        logger.errorFromCatch(e, 'Permanent account deletion', account.user_id);
      }
    }
    
    return deletedCount;
  } catch (error) {
    logger.errorFromCatch(error, 'Permanently delete old accounts');
    return 0;
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
    // Validate environment
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    
    const results = {
      reengagement_6m_sent: 0,
      reengagement_1y_sent: 0,
      permanent_deletions: 0
    };

    // Execute cleanup tasks
    results.reengagement_6m_sent = await send6MonthReengagementEmails();
    results.reengagement_1y_sent = await send1YearReengagementEmails();
    results.permanent_deletions = await permanentlyDeleteOldAccounts();

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...results,
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
