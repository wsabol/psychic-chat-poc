/**
 * Temp Account Cleanup Lambda Function
 * 
 * Scheduled to run every 8 hours via EventBridge
 * Deletes temporary accounts older than 8 hours from database and Firebase
 * 
 * Schedule: 0 *\/8 * * * (every 8 hours)
 */

import { db } from '../shared/db.js';
import { auth } from '../shared/firebase.js';
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
  logger.info('Starting temp account cleanup job', { event });
  
  try {
    // Validate environment
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    
    // Find all temp accounts older than 8 hours from database
    const { rows: oldTempUsers } = await db.query(
      `SELECT user_id, created_at FROM user_personal_info 
       WHERE pgp_sym_decrypt(email_encrypted, $1) LIKE 'temp_%@psychic.local' 
         AND created_at < $2 
       LIMIT 1000`,
      [ENCRYPTION_KEY, eightHoursAgo]
    );
    
    logger.info(`Found ${oldTempUsers.length} temp accounts to clean up`);
    
    if (oldTempUsers.length > 0) {
      // Log age info for monitoring
      oldTempUsers.slice(0, 5).forEach(u => {
        const ageInHours = ((Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60)).toFixed(2);
        logger.info(`Account ${u.user_id.substring(0, 8)}... age: ${ageInHours}h`);
      });
    }
    
    let dbDeletedCount = 0;
    let firebaseDeletedCount = 0;
    let firebaseErrorCount = 0;
    const uids = oldTempUsers.map(u => u.user_id);
    
    if (uids.length > 0) {
      // Delete from database (fast operation)
      try {
        await db.query(`DELETE FROM user_personal_info WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM user_astrology WHERE user_id = ANY($1)`, [uids]);
        await db.query(`DELETE FROM messages WHERE user_id = ANY($1)`, [uids]);
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
        
        dbDeletedCount = uids.length;
        logger.info(`Deleted ${dbDeletedCount} temp accounts from database`);
      } catch (error) {
        logger.errorFromCatch(error, 'Database cleanup');
        throw error;
      }
      
      // Delete from Firebase (slower, more error-prone)
      for (const uid of uids) {
        try { 
          await auth.deleteUser(uid);
          firebaseDeletedCount++;
        } catch (err) {
          if (err.code !== 'auth/user-not-found') {
            firebaseErrorCount++;
            logger.error(err, `Firebase deletion failed for ${uid}`);
          }
        }
      }
      
      logger.info(`Firebase cleanup: ${firebaseDeletedCount} deleted, ${firebaseErrorCount} errors`);
    }
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Log summary
    logger.summary({
      database_deleted: dbDeletedCount,
      firebase_deleted: firebaseDeletedCount,
      firebase_errors: firebaseErrorCount,
      total_deleted: dbDeletedCount
    }, duration);
    
    // Return success response
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
    logger.errorFromCatch(error, 'Lambda execution failed');
    
    // Return error response (Lambda will retry on failure)
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
