/**
 * Account status checks for violations
 * Checks suspension and disabled status
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

/**
 * Check if account is currently suspended
 */
export async function isAccountSuspended(userId) {
  try {
    const { rows } = await db.query(
      `SELECT is_suspended, suspension_end_date FROM user_personal_info WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) return false;

    const { is_suspended, suspension_end_date } = rows[0];

    if (!is_suspended) return false;

    // Check if suspension has expired
    if (suspension_end_date && new Date() > new Date(suspension_end_date)) {
      // Lift suspension
      await db.query(
        `UPDATE user_personal_info SET is_suspended = FALSE, suspension_end_date = NULL WHERE user_id = $1`,
        [userId]
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error('[VIOLATION] Error checking account suspension:', err);
    return false;
  }
}

/**
 * Check if account is permanently disabled
 */
export async function isAccountDisabled(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const { rows } = await db.query(
      `SELECT is_account_disabled FROM user_violations WHERE user_id_hash = $1 AND is_account_disabled = TRUE LIMIT 1`,
      [userIdHash]
    );

    return rows.length > 0;
  } catch (err) {
    console.error('[VIOLATION] Error checking if account is disabled:', err);
    return false;
  }
}
