/**
 * Account Cleanup Job
 * Scheduled task to handle account deletion lifecycle:
 * - Day 1-30: Grace period (user can cancel)
 * - Day 31-364: Pending deletion
 * - Day 365: Send re-engagement email + anonymize data
 * - Day 730: Permanent deletion
 */

import { db } from '../shared/db.js';
import { sendReEngagementEmail } from '../shared/emailService.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * Main cleanup job - runs daily
 */
export async function runAccountCleanupJob() {
  try {
    console.log(`[CLEANUP-JOB] Starting account cleanup job at ${new Date().toISOString()}`);

    // Step 1: Find accounts ready for anonymization (1 year old)
    await anonymizeOldAccounts();

    // Step 2: Send re-engagement emails (at 1-year mark)
    await sendReEngagementEmails();

    // Step 3: Find accounts ready for permanent deletion (2 years old)
    await permanentlyDeleteOldAccounts();

    console.log(`[CLEANUP-JOB] Cleanup job completed successfully`);
    return { success: true };

  } catch (error) {
    console.error('[CLEANUP-JOB] Error during cleanup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Step 1: Anonymize accounts that are 1 year past deletion request
 */
async function anonymizeOldAccounts() {
  try {
    // Get accounts ready for anonymization
    const result = await db.query(
      `SELECT user_id, deletion_requested_at 
       FROM user_personal_info 
       WHERE deletion_status = 'pending_deletion'
         AND deletion_requested_at IS NOT NULL
         AND anonymization_date IS NULL
         AND (CURRENT_DATE - deletion_requested_at::DATE) >= 365`
    );

    console.log(`[ANONYMIZE] Found ${result.rows.length} accounts to anonymize`);

    for (const account of result.rows) {
      try {
        // Anonymize user data
        await db.query(
          `UPDATE user_personal_info
           SET 
             first_name_encrypted = pgp_sym_encrypt($2, $3),
             last_name_encrypted = pgp_sym_encrypt($2, $3),
             email_encrypted = pgp_sym_encrypt($4, $3),
             phone_number_encrypted = NULL,
             sex_encrypted = NULL,
             familiar_name_encrypted = NULL,
             birth_date_encrypted = NULL,
             birth_city_encrypted = NULL,
             birth_timezone_encrypted = NULL,
             birth_country_encrypted = NULL,
             birth_province_encrypted = NULL,
             address_preference_encrypted = NULL,
             deletion_status = 'anonymized',
             anonymization_date = NOW(),
             updated_at = NOW()
           WHERE user_id = $1`,
          [
            account.user_id,
            `DELETED_${account.user_id}`,
            ENCRYPTION_KEY,
            `deleted_${account.user_id}@deleted.local`
          ]
        );

        // Log anonymization
        await db.query(
          `INSERT INTO account_deletion_audit (user_id, action, reason)
           VALUES ($1, 'ANONYMIZED', 'Automatic anonymization at 1-year mark')`,
          [account.user_id]
        );

        console.log(`[ANONYMIZE] ✅ Anonymized account: ${account.user_id}`);

      } catch (error) {
        console.error(`[ANONYMIZE] ❌ Failed to anonymize ${account.user_id}:`, error.message);
      }
    }

  } catch (error) {
    console.error('[ANONYMIZE] Error in anonymization batch:', error);
  }
}

/**
 * Step 2: Send re-engagement emails to users at 1-year mark
 * Gives them opportunity to reactivate before permanent deletion
 */
async function sendReEngagementEmails() {
  try {
    // Get accounts that just hit 1-year mark (send email once)
    const result = await db.query(
      `SELECT user_id, email_encrypted, deletion_requested_at, final_deletion_date
       FROM user_personal_info 
       WHERE deletion_status = 'anonymized'
         AND anonymization_date IS NOT NULL
         AND (CURRENT_DATE - anonymization_date::DATE) = 0`  // Just anonymized today
    );

    console.log(`[RE-ENGAGEMENT] Found ${result.rows.length} accounts to email`);

    for (const account of result.rows) {
      try {
        // Decrypt email to send
        const emailResult = await db.query(
          `SELECT pgp_sym_decrypt($1, $2) as email FROM (SELECT $1::bytea) t`,
          [account.email_encrypted, ENCRYPTION_KEY]
        );

        const email = emailResult.rows[0]?.email;
        if (!email || email.includes('deleted')) {
          console.log(`[RE-ENGAGEMENT] ⚠️  No valid email for ${account.user_id}, skipping`);
          continue;
        }

        // Send re-engagement email
        const finalDeleteDate = new Date(account.final_deletion_date).toISOString().split('T')[0];
        
        const emailSent = await sendReEngagementEmail({
          email,
          userId: account.user_id,
          deletionDate: finalDeleteDate,
          reactivationLink: `${process.env.FRONTEND_URL || 'https://psychicchat.app'}/reactivate?userId=${account.user_id}`
        });

        if (emailSent) {
          console.log(`[RE-ENGAGEMENT] ✅ Sent re-engagement email to ${email}`);
        } else {
          console.log(`[RE-ENGAGEMENT] ⚠️  Failed to send email to ${email}`);
        }

      } catch (error) {
        console.error(`[RE-ENGAGEMENT] ❌ Error sending email for ${account.user_id}:`, error.message);
      }
    }

  } catch (error) {
    console.error('[RE-ENGAGEMENT] Error in email batch:', error);
  }
}

/**
 * Step 3: Permanently delete accounts that are 2 years past deletion request
 */
async function permanentlyDeleteOldAccounts() {
  try {
    // Get accounts ready for permanent deletion
    const result = await db.query(
      `SELECT user_id, deletion_requested_at 
       FROM user_personal_info 
       WHERE deletion_status = 'anonymized'
         AND deletion_requested_at IS NOT NULL
         AND (CURRENT_DATE - deletion_requested_at::DATE) >= 730`
    );

    console.log(`[PERMANENT-DELETE] Found ${result.rows.length} accounts to permanently delete`);

    for (const account of result.rows) {
      try {
        // Delete chat messages
        await db.query('DELETE FROM messages WHERE user_id = $1', [account.user_id]);

        // Delete astrology readings
        await db.query('DELETE FROM astrology_readings WHERE user_id = $1', [account.user_id]);

        // Delete consents
        await db.query('DELETE FROM user_consents WHERE user_id = $1', [account.user_id]);

        // Delete refresh tokens
        await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [account.user_id]);

        // Delete user profile (but keep anonymized record for audit)
        await db.query(
          `UPDATE user_personal_info 
           SET deletion_status = 'deleted',
               final_deletion_date = NOW(),
               updated_at = NOW()
           WHERE user_id = $1`,
          [account.user_id]
        );

        // Keep audit record but mark as archived
        await db.query(
          `INSERT INTO account_deletion_audit (user_id, action, reason)
           VALUES ($1, 'PERMANENTLY_DELETED', 'Automatic deletion at 2-year mark')`,
          [account.user_id]
        );

        console.log(`[PERMANENT-DELETE] ✅ Permanently deleted account: ${account.user_id}`);

      } catch (error) {
        console.error(`[PERMANENT-DELETE] ❌ Failed to delete ${account.user_id}:`, error.message);
      }
    }

  } catch (error) {
    console.error('[PERMANENT-DELETE] Error in deletion batch:', error);
  }
}

/**
 * Get cleanup job status/stats
 */
export async function getCleanupJobStatus() {
  try {
    const stats = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM user_personal_info WHERE deletion_status = 'pending_deletion') as pending_deletion_count,
        (SELECT COUNT(*) FROM user_personal_info WHERE deletion_status = 'anonymized') as anonymized_count,
        (SELECT COUNT(*) FROM user_personal_info WHERE deletion_status = 'deleted') as permanently_deleted_count,
        (SELECT COUNT(*) FROM account_deletion_audit) as total_deletion_events
      `
    );

    return stats.rows[0];
  } catch (error) {
    console.error('[CLEANUP-STATUS] Error getting stats:', error);
    return null;
  }
}

export default { runAccountCleanupJob, getCleanupJobStatus };
