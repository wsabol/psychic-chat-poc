/**
 * violationHandler.js
 * Handles violation logging, checking, and enforcement
 */

import { db } from './db.js';

/**
 * Log a violation for a user
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation (e.g., 'age_restriction', 'foul_language')
 * @param {string} severity - 'warning' or 'critical'
 * @param {string} reason - Details about the violation
 */
export async function logViolation(userId, violationType, severity = 'warning', reason = '') {
  try {
    const result = await db.query(
      `INSERT INTO user_violations (user_id, violation_type, severity, reason, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, violation_type, severity, created_at`,
      [userId, violationType, severity, reason]
    );

    console.log(`[VIOLATION] Logged ${severity} violation for user ${userId}: ${violationType}`);
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
    const result = await db.query(
      `SELECT COUNT(*) as count FROM user_violations
       WHERE user_id = $1 AND violation_type = $2 AND is_active = true`,
      [userId, violationType]
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
    const result = await db.query(
      `SELECT id, violation_type, severity, reason, created_at
       FROM user_violations
       WHERE user_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userId]
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
    console.log('[VIOLATION] Resolved violation:', violationId);
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
    console.log(`[VIOLATION] Deleting account for user ${userId}...`);

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
    await db.query(
      `UPDATE user_violations SET is_active = false WHERE user_id = $1`,
      [userId]
    );

    // Log the deletion
    await db.query(
      `INSERT INTO user_violations (user_id, violation_type, severity, reason, is_active)
       VALUES ($1, 'account_deleted', 'critical', 'Account deleted due to policy violation', false)`,
      [userId]
    );

    console.log(`[VIOLATION] Account ${userId} deleted successfully`);
    return true;
  } catch (err) {
    console.error('[VIOLATION] Error deleting account:', err);
    throw err;
  }
}

/**
 * Handle age restriction violation
 * 1st violation: Log warning
 * 2nd violation: Delete account
 * @param {string} userId - User ID
 * @param {number} userAge - User's calculated age
 * @returns {object} { violationCount: number, deleted: boolean, error: string | null }
 */
export async function handleAgeViolation(userId, userAge) {
  try {
    // Get existing age violations
    const violationCount = await getActiveViolationCount(userId, 'age_restriction');
    const newViolationCount = violationCount + 1;

    console.log(`[AGE-VIOLATION] User ${userId} is ${userAge} years old. Violation count: ${newViolationCount}`);

    if (newViolationCount === 1) {
      // First violation: Log warning
      await logViolation(
        userId,
        'age_restriction',
        'critical',
        `User is ${userAge} years old (under 18). First age restriction violation.`
      );

      return {
        violationCount: 1,
        deleted: false,
        error: null,
        message: 'Age violation logged. This is your first warning.'
      };
    } else if (newViolationCount >= 2) {
      // Second+ violation: Delete account
      await logViolation(
        userId,
        'age_restriction',
        'critical',
        `User is ${userAge} years old (under 18). Second age restriction violation - ACCOUNT DELETED.`
      );

      await deleteUserAccount(userId);

      return {
        violationCount: newViolationCount,
        deleted: true,
        error: 'Account has been deleted due to policy violation.',
        message: 'Account deleted.'
      };
    }
  } catch (err) {
    console.error('[AGE-VIOLATION] Error handling age violation:', err);
    return {
      violationCount: 0,
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
