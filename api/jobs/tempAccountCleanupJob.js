/**
 * Temporary Account Cleanup Job
 * Scheduled task to delete temp accounts older than 24 hours
 * Prevents Firebase cost buildup from accumulating test/temporary accounts
 */

import { db } from '../shared/db.js';
import { auth as firebaseAuth } from '../shared/firebase-admin.js';
import { logErrorFromCatch, logWarning } from '../shared/errorLogger.js';
import { cleanupOrphanedFirebaseAccountsAsync } from './cleanupOrphanedFirebaseAccounts.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * Main temp account cleanup job - runs every 8 hours
 * Cleans up temp accounts older than 8 hours from both database AND Firebase
 */
export async function runTempAccountCleanupJob() {
  try {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    
    // Find all temp accounts older than 24 hours from DATABASE
    const { rows: oldTempUsers } = await db.query(
      `SELECT user_id FROM user_personal_info 
       WHERE pgp_sym_decrypt(email_encrypted, $1) LIKE 'temp_%@psychic.local' 
         AND created_at < $2 
       LIMIT 1000`,
      [ENCRYPTION_KEY, eightHoursAgo]
    );
    
    let dbDeletedCount = 0;
    let firebaseDeletedCount = 0;
    const uids = oldTempUsers.map(u => u.user_id);
    
    if (uids.length > 0) {
      // Delete from database FIRST (fast operation)
      try {
        await db.query(`DELETE FROM user_personal_info WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM user_astrology WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM messages WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM user_2fa_settings WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM user_2fa_codes WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM astrology_readings WHERE user_id = ANY($1)`, [uids]);
        dbDeletedCount = uids.length;
      } catch (error) {
        await logErrorFromCatch(error, 'temp-account-cleanup', 'Database cleanup');
      }
      
      // Delete from Firebase in BACKGROUND (don't wait, don't block scheduler)
      setImmediate(async () => {
        for (const uid of uids) {
          try { 
            await firebaseAuth.deleteUser(uid);
            firebaseDeletedCount++;
          } catch (err) {
            if (err.code !== 'auth/user-not-found') {
              await logWarning({
                service: 'temp-account-cleanup',
                message: `Failed to delete Firebase user ${uid}`,
                context: 'Firebase deletion during temp account cleanup'
              }).catch(() => {});
            }
          }
        }
      });
    }
    
    // ALSO cleanup orphaned Firebase accounts (async, non-blocking)
    cleanupOrphanedFirebaseAccountsAsync(eightHoursAgo);
    
    return {
      success: true,
      database_deleted: dbDeletedCount,
      firebase_deleted: firebaseDeletedCount,
      firebase_orphans_deleted: 0,
      total_deleted: dbDeletedCount + firebaseDeletedCount,
      note: 'Firebase and orphaned account deletions happen in background to avoid blocking scheduler'
    };
    
  } catch (error) {
    await logErrorFromCatch(error, 'temp-account-cleanup', 'Run temp account cleanup job');
    return { 
      success: false, 
      error: error.message,
      database_deleted: 0,
      firebase_deleted: 0,
      firebase_orphans_deleted: 0,
      total_deleted: 0
    };
  }
}

/**
 * Get temp account cleanup job status
 */
export async function getTempAccountCleanupJobStatus() {
  try {
    const tempAccounts = await db.query(
      `SELECT 
        COUNT(*) as total_temp_accounts,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as created_last_24h,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '2 day' THEN 1 END) as created_last_48h,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '3 day' THEN 1 END) as created_last_72h
       FROM user_personal_info 
       WHERE pgp_sym_decrypt(email_encrypted, $1) LIKE 'temp_%@psychic.local'`,
      [ENCRYPTION_KEY]
    );
    
    return tempAccounts.rows[0];
  } catch (error) {
    await logErrorFromCatch(error, 'temp-account-cleanup', 'Get status');
    return null;
  }
}

export default { runTempAccountCleanupJob, getTempAccountCleanupJobStatus };
