/**
 * Temp Account Cleanup Lambda Function
 * 
 * Scheduled to run every 8 hours via EventBridge
 * Deletes temporary accounts older than 8 hours from database and Firebase
 * 
 * Schedule: 0 *\/8 * * * (every 8 hours)
 */

import { db } from '../shared/db.js';
import { auth, initializeFirebase } from '../shared/firebase.js';
import { createLogger } from '../shared/errorLogger.js';

const logger = createLogger('temp-account-cleanup');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

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
    
    // Initialize Firebase (will reuse if already initialized)
    await initializeFirebase();
    
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    
    // Find all temp accounts older than 8 hours from database
    const { rows: oldTempUsers } = await db.query(
      `SELECT user_id, created_at FROM user_personal_info 
       WHERE pgp_sym_decrypt(email_encrypted, $1) LIKE 'temp_%@psychic.local' 
         AND created_at < $2 
       LIMIT 1000`,
      [ENCRYPTION_KEY, eightHoursAgo]
    );
    
    let dbDeletedCount = 0;
    let firebaseDeletedCount = 0;
    let firebaseErrorCount = 0;
    const uids = oldTempUsers.map(u => u.user_id);
    
    if (uids.length > 0) {
      // Delete from database (fast operation)
      try {
        
        // Delete from all related tables
        await db.query(`DELETE FROM free_trial_sessions WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM messages WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM user_astrology WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM user_2fa_settings WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM user_2fa_codes WHERE user_id = ANY($1)`, [uids]);
        
        // Check if astrology_readings table exists before deleting
        try {
          await db.query(`DELETE FROM astrology_readings WHERE user_id = ANY($1)`, [uids]);
        } catch (astrologyErr) {
          if (astrologyErr.code !== '42P01') { // 42P01 = table does not exist
            logger.warning('Error deleting from astrology_readings', '', astrologyErr);
          }
        }
        
        // Delete from user_personal_info last (parent table)
        await db.query(`DELETE FROM user_personal_info WHERE user_id = ANY($1)`, [uids]);
        
        dbDeletedCount = uids.length;
      } catch (error) {
        logger.errorFromCatch(error, 'Database cleanup');
        throw error;
      }
      
      // Delete from Firebase (slower, more error-prone)
      for (const uid of uids) {
        try { 
          const deleted = await auth.deleteUser(uid);
          if (deleted) {
            firebaseDeletedCount++;
          }
        } catch (err) {
          if (err.code !== 'auth/user-not-found') {
            firebaseErrorCount++;
            logger.error(err, `Firebase deletion failed for ${uid}`);
            console.error(`[TempAccountCleanup] Failed to delete Firebase user ${uid}:`, err.message);
          } else {
            // User not found in Firebase, count as success since DB was cleaned
            firebaseDeletedCount++;
          }
        }
      }
    }
    
    // ALSO cleanup orphaned Firebase accounts (accounts not in database)
    // This handles temp accounts that exist only in Firebase
    let orphanedDeleted = 0;
    let orphanedErrors = 0;
    
    try {
      
      // List all Firebase users with pagination
      let pageToken;
      let hasMore = true;
      let totalScanned = 0;

      while (hasMore) {
        const listUsersResult = pageToken 
          ? await auth.listUsers(pageToken, 1000)
          : await auth.listUsers(null, 1000);
        totalScanned += listUsersResult.users.length;

        for (const user of listUsersResult.users) {
          if (user.email && user.email.startsWith('temp_') && user.email.endsWith('@psychic.local')) {
            const createdTime = new Date(user.metadata.creationTime);
            
            // Delete if older than 8 hours (regardless of database presence)
            if (createdTime < eightHoursAgo) {
              try {
                await auth.deleteUser(user.uid);
                orphanedDeleted++;
              } catch (err) {
                if (err.code !== 'auth/user-not-found') {
                  orphanedErrors++;
                  console.error(`[TempAccountCleanup] Failed to delete orphaned account ${user.uid}:`, err.message);
                }
              }
            }
          }
        }

        // Get next page token
        pageToken = listUsersResult.pageToken;
        hasMore = !!pageToken;
      }
      
    } catch (orphanErr) {
      console.error('[TempAccountCleanup] Firebase orphan scan failed:', orphanErr.message);
      logger.error(orphanErr, 'Firebase orphan scan failed');
    }
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Return success response with stats (CloudWatch captures all console output)
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        database_deleted: dbDeletedCount,
        firebase_deleted: firebaseDeletedCount,
        firebase_orphaned_deleted: orphanedDeleted,
        firebase_errors: firebaseErrorCount + orphanedErrors,
        total_deleted: dbDeletedCount + orphanedDeleted,
        duration_ms: duration,
        note: 'Temp accounts older than 8 hours cleaned up successfully (database + Firebase orphans)'
      })
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[TempAccountCleanup] Lambda execution failed after ${duration}ms:`, error.message);
    console.error('[TempAccountCleanup] Stack trace:', error.stack);
    logger.errorFromCatch(error, 'Lambda execution failed');
    
    // Return error response (Lambda will retry on failure)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        duration_ms: duration
      })
    };
  }
};

export default { handler };
