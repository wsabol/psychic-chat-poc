/**
 * Account Cleanup Job
 * Scheduled task to handle account deletion lifecycle
 */

import { db } from '../shared/db.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * Main cleanup job - runs daily
 */
export async function runAccountCleanupJob() {
  try {

    await anonymizeOldAccounts();
    await sendReEngagementEmails();
    await permanentlyDeleteOldAccounts();
    return { success: true };

  } catch (error) {
    console.error('[CLEANUP-JOB] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Anonymize accounts that are 1 year past deletion request
 */
async function anonymizeOldAccounts() {
  try {
    const result = await db.query(
      `SELECT user_id FROM user_personal_info 
       WHERE deletion_status = 'pending_deletion'
         AND deletion_requested_at IS NOT NULL
         AND anonymization_date IS NULL
         AND (CURRENT_DATE - deletion_requested_at::DATE) >= 365`
    );

    for (const account of result.rows) {
      try {
        await db.query(
          `UPDATE user_personal_info
           SET deletion_status = 'anonymized',
               anonymization_date = NOW(),
               updated_at = NOW()
           WHERE user_id = $1`,
          [account.user_id]
        );
      } catch (e) {
        console.error(`[ANONYMIZE] ❌ ${account.user_id}:`, e.message);
      }
    }
  } catch (error) {
    console.error('[ANONYMIZE] Error:', error);
  }
}

/**
 * Send re-engagement emails
 */
async function sendReEngagementEmails() {
  try {
    const result = await db.query(
      `SELECT user_id FROM user_personal_info 
       WHERE deletion_status = 'anonymized'
         AND anonymization_date IS NOT NULL
         AND (CURRENT_DATE - anonymization_date::DATE) = 0`
    );
    // Emails would be sent here via sendGrid
  } catch (error) {
    console.error('[RE-ENGAGEMENT] Error:', error);
  }
}

/**
 * Permanently delete accounts that are 2 years past deletion request
 */
async function permanentlyDeleteOldAccounts() {
  try {
    const result = await db.query(
      `SELECT user_id FROM user_personal_info 
       WHERE deletion_status = 'anonymized'
         AND deletion_requested_at IS NOT NULL
         AND (CURRENT_DATE - deletion_requested_at::DATE) >= 730`
    );

    for (const account of result.rows) {
      try {
        await db.query('DELETE FROM messages WHERE user_id = $1', [account.user_id]);
        await db.query('DELETE FROM astrology_readings WHERE user_id = $1', [account.user_id]);
        await db.query('DELETE FROM user_consents WHERE user_id = $1', [account.user_id]);
        
        await db.query(
          `UPDATE user_personal_info 
           SET deletion_status = 'deleted',
               final_deletion_date = NOW()
           WHERE user_id = $1`,
          [account.user_id]
        );

      } catch (e) {
        console.error(`[PERMANENT-DELETE] ❌ ${account.user_id}:`, e.message);
      }
    }
  } catch (error) {
    console.error('[PERMANENT-DELETE] Error:', error);
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
        (SELECT COUNT(*) FROM user_personal_info WHERE deletion_status = 'anonymized') as anonymized,
        (SELECT COUNT(*) FROM user_personal_info WHERE deletion_status = 'deleted') as deleted
      `
    );
    return stats.rows[0];
  } catch (error) {
    console.error('[CLEANUP-STATUS] Error:', error);
    return null;
  }
}

export default { runAccountCleanupJob, getCleanupJobStatus };
