/**
 * Cleanup Orphaned Firebase Accounts
 * Finds and deletes temp accounts that exist in Firebase but not in the database
 * Runs in the background (non-blocking)
 * Handles pagination to get ALL Firebase users
 */

import { db } from '../shared/db.js';
import { auth as firebaseAuth } from '../shared/firebase-admin.js';
import { logWarning } from '../shared/errorLogger.js';

/**
 * Delete orphaned Firebase accounts (async, non-blocking)
 * Returns immediately, deletion happens in background
 */
export function cleanupOrphanedFirebaseAccountsAsync(oneDayAgo) {
  // Run in background without blocking
  setImmediate(async () => {
    try {
      console.log('[Cleanup] Starting orphaned Firebase account scan...');
      let deletedCount = 0;
      let errorCount = 0;
      let totalScanned = 0;

      // List all Firebase users with pagination
      let pageToken;
      let hasMore = true;

      while (hasMore) {
        try {
          const listUsersResult = await firebaseAuth.listUsers(1000, pageToken);
          console.log(`[Cleanup] Scanned batch of ${listUsersResult.users.length} Firebase users`);
          totalScanned += listUsersResult.users.length;

          for (const user of listUsersResult.users) {
            if (user.email && user.email.startsWith('temp_') && user.email.endsWith('@psychic.local')) {
              // Check if this user exists in database
              const dbResult = await db.query(
                'SELECT user_id FROM user_personal_info WHERE user_id = $1', 
                [user.uid]
              );
              
              // If not in database, it's orphaned
              if (dbResult.rows.length === 0) {
                const createdTime = new Date(user.metadata.creationTime);
                
                // Only delete if older than 24 hours
                if (createdTime < oneDayAgo) {
                  try {
                    await firebaseAuth.deleteUser(user.uid);
                    deletedCount++;
                    console.log(`[Cleanup] ✓ Deleted orphaned Firebase account: ${user.email}`);
                  } catch (err) {
                    if (err.code !== 'auth/user-not-found') {
                      console.error(`[Cleanup] ✗ Failed to delete orphaned account ${user.uid}:`, err.message);
                      errorCount++;
                    }
                  }
                }
              }
            }
          }

          // Get next page token
          pageToken = listUsersResult.pageToken;
          hasMore = !!pageToken;
        } catch (pageErr) {
          console.error('[Cleanup] ✗ Error during pagination:', pageErr.message);
          hasMore = false;
          errorCount++;
        }
      }

      console.log(`[Cleanup] ✓ Orphaned Firebase cleanup complete: Scanned ${totalScanned}, Deleted ${deletedCount}, Errors ${errorCount}`);
    } catch (err) {
      console.error('[Cleanup] ✗ Orphaned Firebase account scan failed:', err.message);
    }
  });
}

export default { cleanupOrphanedFirebaseAccountsAsync };
