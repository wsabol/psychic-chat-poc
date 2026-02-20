/**
 * Temporary Account Cleanup Job
 * Scheduled task to delete stale guest (free-trial) sessions older than 8 hours.
 *
 * Guest sessions are now identified via the free_trial_sessions table —
 * no Firebase accounts are created for free-trial users.
 * All cleanup is pure database work; Firebase is not involved.
 */

import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * Main temp account cleanup job — runs every 8 hours via the scheduler.
 * Finds stale free_trial_sessions and deletes all associated DB records.
 */
export async function runTempAccountCleanupJob() {
  try {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

    // Source of truth: free_trial_sessions (keyed by user_id_hash)
    const { rows: staleSessions } = await db.query(
      `SELECT user_id_hash
       FROM free_trial_sessions
       WHERE created_at < $1
       LIMIT 1000`,
      [eightHoursAgo]
    );

    if (staleSessions.length === 0) {
      return {
        success: true,
        database_deleted: 0,
        total_deleted: 0,
        note: 'No stale guest sessions found.'
      };
    }

    const hashes = staleSessions.map(r => r.user_id_hash);

    // Collect raw user_ids for tables keyed by user_id (not hash)
    const { rows: piRows } = await db.query(
      `SELECT user_id FROM user_personal_info
       WHERE user_id LIKE 'temp_%'
         AND created_at < $1
       LIMIT 1000`,
      [eightHoursAgo]
    );
    const userIds = piRows.map(r => r.user_id);

    // Delete hash-keyed tables
    await db.query(`DELETE FROM user_astrology    WHERE user_id_hash = ANY($1)`, [hashes]);
    await db.query(`DELETE FROM messages          WHERE user_id_hash = ANY($1)`, [hashes]);
    await db.query(`DELETE FROM user_preferences  WHERE user_id_hash = ANY($1)`, [hashes]);

    // Delete user_id-keyed tables (only if there are any to delete)
    if (userIds.length > 0) {
      await db.query(`DELETE FROM user_personal_info WHERE user_id = ANY($1)`, [userIds]);
      await db.query(`DELETE FROM user_2fa_settings  WHERE user_id = ANY($1)`, [userIds]);
      await db.query(`DELETE FROM user_2fa_codes     WHERE user_id = ANY($1)`, [userIds]);
    }

    // Delete sessions last (parent record)
    await db.query(`DELETE FROM free_trial_sessions WHERE user_id_hash = ANY($1)`, [hashes]);

    const deletedCount = hashes.length;

    return {
      success: true,
      database_deleted: deletedCount,
      total_deleted: deletedCount,
      note: 'Stale guest sessions cleaned up from database.'
    };

  } catch (error) {
    await logErrorFromCatch(error, 'temp-account-cleanup', 'runTempAccountCleanupJob');
    return {
      success: false,
      error: error.message,
      database_deleted: 0,
      total_deleted: 0
    };
  }
}

/**
 * Get temp account cleanup job status.
 * Uses free_trial_sessions as the source of truth (no Firebase dependency).
 */
export async function getTempAccountCleanupJobStatus() {
  try {
    const { rows } = await db.query(
      `SELECT
        COUNT(*)                                                              AS total_guest_sessions,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day'  THEN 1 END)  AS created_last_24h,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '2 days' THEN 1 END)  AS created_last_48h,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '3 days' THEN 1 END)  AS created_last_72h
       FROM free_trial_sessions`
    );
    return rows[0];
  } catch (error) {
    await logErrorFromCatch(error, 'temp-account-cleanup', 'getTempAccountCleanupJobStatus');
    return null;
  }
}

export default { runTempAccountCleanupJob, getTempAccountCleanupJobStatus };
