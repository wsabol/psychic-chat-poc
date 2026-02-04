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
    console.log('[TempAccountCleanup] Initializing Firebase...');
    await initializeFirebase();
    console.log('[TempAccountCleanup] Firebase initialized successfully');
    
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
        console.log(`[TempAccountCleanup] Deleting ${uids.length} temp accounts from database...`);
        
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
        console.log(`[TempAccountCleanup] Successfully deleted ${dbDeletedCount} accounts from database`);
      } catch (error) {
        logger.errorFromCatch(error, 'Database cleanup');
        throw error;
      }
      
      // Delete from Firebase (slower, more error-prone)
      console.log(`[TempAccountCleanup] Deleting ${uids.length} users from Firebase...`);
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
      console.log(`[TempAccountCleanup] Firebase deletion complete: ${firebaseDeletedCount} deleted, ${firebaseErrorCount} errors`);
    }
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Log summary
    console.log(`[TempAccountCleanup] Cleanup completed in ${duration}ms`);
    console.log(`[TempAccountCleanup] Database deleted: ${dbDeletedCount}`);
    console.log(`[TempAccountCleanup] Firebase deleted: ${firebaseDeletedCount}`);
    console.log(`[TempAccountCleanup] Firebase errors: ${firebaseErrorCount}`);
    
    // Return success response with stats (CloudWatch captures all console output)
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        database_deleted: dbDeletedCount,
        firebase_deleted: firebaseDeletedCount,
        firebase_errors: firebaseErrorCount,
        total_deleted: dbDeletedCount,
        duration_ms: duration,
        note: 'Temp accounts older than 8 hours cleaned up successfully'
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
