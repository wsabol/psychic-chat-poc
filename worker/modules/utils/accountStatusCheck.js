/**
 * Account Status Check Utility
 * Validates user account status and returns early with appropriate responses
 */

import { isAccountDisabled, isAccountSuspended } from '../violationEnforcement.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Check if account is locked (disabled or suspended)
 * Returns response if locked, null if account is good
 * 
 * @param {string} userId - User ID
 * @param {boolean} tempUser - Is this a temporary/trial account
 * @returns {Promise<string|null>} - Response message if locked, null if OK
 */
export async function checkAccountStatus(userId, tempUser) {
    try {
        // Skip checks for temporary accounts
        if (tempUser) {
            return null;
        }

        // Check if account is disabled
        const disabled = await isAccountDisabled(userId);
        if (disabled) {
            return `Your account has been permanently disabled due to repeated violations of our community guidelines. If you wish to appeal, please contact support.`;
        }

        // Check if account is suspended
        const suspended = await isAccountSuspended(userId);
        if (suspended) {
            return `Your account is currently suspended. Please try again after the suspension period ends.`;
        }

        // Account is good
        return null;
    } catch (err) {
        logErrorFromCatch('[ACCOUNT-STATUS] Error checking account:', err.message);
        // On error, allow access (fail-safe)
        return null;
    }
}
