/**
 * Cleanup Orphaned Firebase Accounts
 * Finds and deletes temp accounts that are older than the specified age
 * Deletes temp accounts regardless of whether they exist in the database
 * Runs in the background (non-blocking)
 * Handles pagination to get ALL Firebase users
 */

import { db } from '../shared/db.js';
import { auth as firebaseAuth } from '../shared/firebase-admin.js';
import { logWarning } from '../shared/errorLogger.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Delete old temp Firebase accounts (async, non-blocking)
 * Returns immediately, deletion happens in background
 * @param {Date} ageThreshold - Delete accounts older than this date
 */
export function cleanupOrphanedFirebaseAccountsAsync(ageThreshold) {
  // Run in background without blocking
  setImmediate(async () => {
    try {
      
      let deletedCount = 0;
      let errorCount = 0;
      let totalScanned = 0;
      let tempAccountsFound = 0;
      let skippedTooNew = 0;

      // List all Firebase users with pagination
      let pageToken;
      let hasMore = true;

      while (hasMore) {
        try {
          const listUsersResult = await firebaseAuth.listUsers(1000, pageToken);
          totalScanned += listUsersResult.users.length;

          for (const user of listUsersResult.users) {
            if (user.email && user.email.startsWith('temp_') && user.email.endsWith('@psychic.local')) {
              tempAccountsFound++;
              const createdTime = new Date(user.metadata.creationTime);
              const ageInHours = ((Date.now() - createdTime.getTime()) / (1000 * 60 * 60)).toFixed(2);
              
              // Delete if older than threshold (regardless of database presence)
              if (createdTime < ageThreshold) {
                try {
                  await firebaseAuth.deleteUser(user.uid);
                  deletedCount++;
                } catch (err) {
                  if (err.code !== 'auth/user-not-found') {
                    errorCount++;
                  } else {
                  }
                }
              } else {
                skippedTooNew++;
              }
            }
          }

          // Get next page token
          pageToken = listUsersResult.pageToken;
          hasMore = !!pageToken;
        } catch (pageErr) {
          logErrorFromCatch('[Cleanup] ✗ Error during pagination:', pageErr.message);
          logErrorFromCatch('[Cleanup] Stack trace:', pageErr.stack);
          hasMore = false;
          errorCount++;
        }
      }

    } catch (err) {
      logErrorFromCatch('[Cleanup] ✗ Firebase temp account scan failed:', err.message);
      logErrorFromCatch('[Cleanup] Stack trace:', err.stack);
    }
  });
}

export default { cleanupOrphanedFirebaseAccountsAsync };
