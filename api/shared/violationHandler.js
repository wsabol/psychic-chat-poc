/**
 * violationHandler.js
 * Handles violation logging, checking, and enforcement
 */

import { db } from './db.js';
import { hashUserId } from './hashUtils.js';

/**
 * Log a violation for a user
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation (e.g., 'age_restriction', 'foul_language')
 * @param {string} severity - 'warning' or 'critical'
 * @param {string} reason - Details about the violation
 */
export async function logViolation(userId, violationType, severity = 'warning', reason = '') {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `INSERT INTO user_violations (user_id_hash, violation_type, severity, reason, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, violation_type, severity, created_at`,
      [userIdHash, violationType, severity, reason]
    );

    return result.rows[0];
  } catch (err) {
    console.error('[VIOLATION] Error logging violation:', err);
    throw err;
  }
}

/**
 * Get active violations count for a user by type
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation to count
 * @returns {number} Count of active violations
 */
export async function getActiveViolationCount(userId, violationType) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT COUNT(*) as count FROM user_violations
       WHERE user_id_hash = $1 AND violation_type = $2 AND is_active = true`,
      [userIdHash, violationType]
    );

    return parseInt(result.rows[0].count, 10) || 0;
  } catch (err) {
    console.error('[VIOLATION] Error getting violation count:', err);
    return 0;
  }
}

/**
 * Get all active violations for a user
 * @param {string} userId - User ID
 * @returns {array} List of active violations
 */
export async function getUserViolations(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT id, violation_type, severity, reason, created_at
       FROM user_violations
       WHERE user_id_hash = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userIdHash]
    );

    return result.rows;
  } catch (err) {
    console.error('[VIOLATION] Error fetching violations:', err);
    return [];
  }
}

/**
 * Deactivate a violation (mark as resolved)
 * @param {string} violationId - ID of violation to resolve
 */
export async function resolveViolation(violationId) {
  try {
    await db.query(
      `UPDATE user_violations SET is_active = false WHERE id = $1`,
      [violationId]
    );
  } catch (err) {
    console.error('[VIOLATION] Error resolving violation:', err);
    throw err;
  }
}

/**
 * Delete user account (for enforcement)
 * Anonymizes personal data instead of hard delete for audit trail
 * @param {string} userId - User ID to delete
 */
export async function deleteUserAccount(userId) {
  try {

    // Anonymize personal data
    await db.query(
      `UPDATE user_personal_info
       SET 
         first_name_encrypted = pgp_sym_encrypt('Deleted', $1),
         last_name_encrypted = pgp_sym_encrypt('Account', $1),
         email_encrypted = pgp_sym_encrypt('deleted@deleted.local', $1),
         birth_date_encrypted = NULL,
         birth_city_encrypted = NULL,
         birth_country_encrypted = NULL,
         birth_province_encrypted = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );

    // Mark all violations as handled
    const userIdHash = hashUserId(userId);
    await db.query(
      `UPDATE user_violations SET is_active = false WHERE user_id_hash = $1`,
      [userIdHash]
    );

    // Log the deletion
    await db.query(
      `INSERT INTO user_violations (user_id_hash, violation_type, severity, reason, is_active)
       VALUES ($1, 'account_deleted', 'critical', 'Account deleted due to policy violation', false)`,
      [userIdHash]
    );

    return true;
  } catch (err) {
    console.error('[VIOLATION] Error deleting account:', err);
    throw err;
  }
}

/**
 * Handle age restriction violation
 * POLICY: Users are given 3 chances to fix their birth date
 * - 1st violation: Log warning (1 of 3 attempts remaining)
 * - 2nd violation: Log warning (2 of 3 attempts, 1 remaining)
 * - 3rd violation: Delete account (all 3 attempts used)
 * 
 * @param {string} userId - User ID
 * @param {number} userAge - User's calculated age (should be < 18)
 * @returns {object} { violationCount: number, attemptsRemaining: number, deleted: boolean, error: string | null }
 */
export async function handleAgeViolation(userId, userAge) {
  try {
    // Get existing age violations
    const violationCount = await getActiveViolationCount(userId, 'age_restriction');
    const newViolationCount = violationCount + 1;
    const attemptsRemaining = Math.max(0, 3 - newViolationCount);

    if (newViolationCount === 1) {
      // First violation: Log warning (2 attempts remaining)
      await logViolation(
        userId,
        'age_restriction',
        'warning',
        `User is ${userAge} years old (under 18). Attempt 1 of 3. This appears to be a typo in your birth date.`
      );

      return {
        violationCount: 1,
        attemptsRemaining: 2,
        deleted: false,
        error: null,
        message: 'Birth date error detected. This is attempt 1 of 3. Please correct your birth date. You have 2 more attempts.'
      };
    } else if (newViolationCount === 2) {
      // Second violation: Log warning (1 attempt remaining)
      await logViolation(
        userId,
        'age_restriction',
        'warning',
        `User is ${userAge} years old (under 18). Attempt 2 of 3.`
      );

      return {
        violationCount: 2,
        attemptsRemaining: 1,
        deleted: false,
        error: null,
        message: 'Birth date error detected again. This is attempt 2 of 3. Please correct your birth date. You have 1 more attempt before your account is deleted.'
      };
    } else if (newViolationCount >= 3) {
      // Third+ violation: Delete account (no attempts remaining)
      await logViolation(
        userId,
        'age_restriction',
        'critical',
        `User is ${userAge} years old (under 18). Attempt 3 of 3 - ACCOUNT DELETED. All 3 correction attempts have been used.`
      );

      await deleteUserAccount(userId);

      return {
        violationCount: newViolationCount,
        attemptsRemaining: 0,
        deleted: true,
        error: 'Account has been terminated. All 3 attempts to correct your birth date have been used. Users must be 18 years or older.',
        message: 'Account deleted.'
      };
    }
  } catch (err) {
    console.error('[AGE-VIOLATION] Error handling age violation:', err);
    return {
      violationCount: 0,
      attemptsRemaining: 3,
      deleted: false,
      error: err.message
    };
  }
}

export default {
  logViolation,
  getActiveViolationCount,
  getUserViolations,
  resolveViolation,
  deleteUserAccount,
  handleAgeViolation
};
