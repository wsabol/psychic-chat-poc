/**
 * Legal Data Repository
 * Handles all database operations for legal data requests
 * Implements repository pattern for clean separation of concerns
 */

import crypto from 'crypto';
import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { getEncryptionKey } from '../../shared/decryptionHelper.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import {
  buildFindUserByEmailQuery,
  buildFindUserByEmailHashQuery,
  buildGetMessagesQuery,
  buildGetAuditTrailQuery,
  buildGetUserProfileQuery,
  buildGetViolationsQuery
} from './legalDataQueryBuilder.js';
import {
  transformMessageRow,
  transformAuditRow,
  transformUserProfileRow,
  transformViolationRow,
  transformUserSearchResult
} from './legalDataTransformers.js';
import { LEGAL_AUDIT_ACTIONS, DEFAULT_LIMITS, ERROR_MESSAGES } from './constants.js';

/**
 * Find user by email address.
 *
 * Two-stage lookup to handle both active and anonymized accounts:
 *
 * Stage 1 — Active accounts (email_encrypted still present)
 *   Decrypts email_encrypted and compares to the supplied email.
 *   Works for accounts that are active or within the 30-day grace period.
 *
 * Stage 2 — Anonymized accounts (email_encrypted has been NULLed)
 *   Computes SHA-256(email) and compares to the stored email_hash.
 *   This is the legal-traceability fallback: even after PII is deleted,
 *   an admin who knows the plaintiff's email can still find the account
 *   and retrieve the retained chat messages.
 *
 * @param {string} email - Email address (will be lowercased/trimmed)
 * @returns {Promise<UserSearchResult|null>}
 * @throws {Error} If database query fails
 */
export async function findUserByEmail(email) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const emailLower = email.toLowerCase().trim();

    // ── Stage 1: active account lookup (decrypted email) ─────────────────
    const { sql: activeSql } = buildFindUserByEmailQuery();
    const activeResult = await db.query(activeSql, [ENCRYPTION_KEY, emailLower]);

    if (activeResult.rows.length > 0) {
      return transformUserSearchResult(activeResult.rows[0]);
    }

    // ── Stage 2: anonymized account lookup (email_hash) ───────────────────
    // Compute SHA-256 of the input email — the same hash stored during anonymization.
    const emailHash = crypto
      .createHash('sha256')
      .update(emailLower)
      .digest('hex');

    const { sql: hashSql } = buildFindUserByEmailHashQuery();
    const hashResult = await db.query(hashSql, [emailHash]);

    if (hashResult.rows.length > 0) {
      // Return the anonymized user result with is_anonymized flag
      const row = hashResult.rows[0];
      return {
        user_id:               row.user_id,
        email:                 null,                // PII deleted
        first_name:            null,
        last_name:             null,
        phone_number:          null,
        email_hash:            row.email_hash,
        created_at:            row.created_at,
        subscription_status:   row.subscription_status,
        is_suspended:          row.is_suspended,
        deletion_requested_at: row.deletion_requested_at,
        deletion_status:       row.deletion_status,
        anonymization_date:    row.anonymization_date,
        final_deletion_date:   row.final_deletion_date,
        is_anonymized:         true,
        note: 'PII has been anonymized per 30-day retention policy. ' +
              'Chat messages are retained under the 7-year legal hold and can be retrieved by user_id.'
      };
    }

    return null;
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'findUserByEmail');
    throw new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${err.message}`);
  }
}

/**
 * Get all messages for a user
 * @param {string} userId - User's UUID
 * @param {MessageQueryOptions} options - Query options
 * @returns {Promise<MessageRecord[]>}
 * @throws {Error} If database query fails
 */
export async function getUserMessages(userId, options = {}) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const userIdHash = hashUserId(userId);
    
    const { sql, paramCount } = buildGetMessagesQuery(options);
    
    // Build params array dynamically based on options
    const params = [ENCRYPTION_KEY, userIdHash];
    
    if (options.startDate) {
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      params.push(options.endDate);
    }
    
    if (options.limit) {
      params.push(options.limit);
    }

    const result = await db.query(sql, params);
    
    return result.rows.map(transformMessageRow);
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'getUserMessages');
    throw new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${err.message}`);
  }
}

/**
 * Get audit trail for a user (legally relevant actions only)
 * @param {string} userId - User's UUID
 * @param {number} daysBack - Days back to retrieve
 * @returns {Promise<AuditTrailRecord[]>}
 * @throws {Error} If database query fails
 */
export async function getUserAuditTrail(userId, daysBack = DEFAULT_LIMITS.DAYS_BACK) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const userIdHash = hashUserId(userId);
    
    const { sql } = buildGetAuditTrailQuery(daysBack);
    
    const result = await db.query(sql, [
      ENCRYPTION_KEY,
      userIdHash,
      daysBack,
      LEGAL_AUDIT_ACTIONS
    ]);
    
    return result.rows.map(transformAuditRow);
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'getUserAuditTrail');
    throw new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${err.message}`);
  }
}

/**
 * Get complete user profile
 * @param {string} userId - User's UUID
 * @returns {Promise<UserProfileRecord>}
 * @throws {Error} If user not found or database query fails
 */
export async function getUserProfile(userId) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    
    const { sql } = buildGetUserProfileQuery();
    
    const result = await db.query(sql, [ENCRYPTION_KEY, userId]);

    if (result.rows.length === 0) {
      throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return transformUserProfileRow(result.rows[0]);
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'getUserProfile');
    
    if (err.message === ERROR_MESSAGES.USER_NOT_FOUND) {
      throw err;
    }
    
    throw new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${err.message}`);
  }
}

/**
 * Get user violations history
 * @param {string} userId - User's UUID
 * @returns {Promise<ViolationRecord[]>}
 * @throws {Error} If database query fails
 */
export async function getUserViolations(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    const { sql } = buildGetViolationsQuery();
    
    const result = await db.query(sql, [userIdHash]);
    
    return result.rows.map(transformViolationRow);
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'getUserViolations');
    throw new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${err.message}`);
  }
}

/**
 * Get all data for a user (messages, audit, profile, violations)
 * Uses Promise.all for parallel queries
 * @param {string} userId - User's UUID
 * @param {Object} options - Options for individual queries
 * @returns {Promise<Object>} Object with messages, auditTrail, profile, violations
 * @throws {Error} If any query fails
 */
export async function getAllUserData(userId, options = {}) {
  try {
    const {
      messageOptions = {},
      auditDaysBack = DEFAULT_LIMITS.DAYS_BACK
    } = options;

    const [messages, auditTrail, profile, violations] = await Promise.all([
      getUserMessages(userId, messageOptions),
      getUserAuditTrail(userId, auditDaysBack),
      getUserProfile(userId),
      getUserViolations(userId)
    ]);

    return {
      messages,
      auditTrail,
      profile,
      violations
    };
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'getAllUserData');
    throw err; // Re-throw to preserve original error
  }
}

/**
 * Check if user exists by ID
 * @param {string} userId - User's UUID
 * @returns {Promise<boolean>}
 */
export async function userExists(userId) {
  try {
    const result = await db.query(
      'SELECT 1 FROM user_personal_info WHERE user_id = $1',
      [userId]
    );
    
    return result.rows.length > 0;
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'userExists');
    return false;
  }
}

/**
 * Get user ID from email
 * @param {string} email - Email address
 * @returns {Promise<string|null>} User ID or null if not found
 */
export async function getUserIdByEmail(email) {
  try {
    const user = await findUserByEmail(email);
    return user ? user.user_id : null;
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'getUserIdByEmail');
    return null;
  }
}

/**
 * Get message count for a user
 * @param {string} userId - User's UUID
 * @returns {Promise<number>} Message count
 */
export async function getUserMessageCount(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE user_id_hash = $1',
      [userIdHash]
    );
    
    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'getUserMessageCount');
    return 0;
  }
}

/**
 * Get audit event count for a user
 * @param {string} userId - User's UUID
 * @param {number} daysBack - Days back to count
 * @returns {Promise<number>} Audit event count
 */
export async function getUserAuditCount(userId, daysBack = DEFAULT_LIMITS.DAYS_BACK) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM audit_log 
       WHERE user_id_hash = $1 
         AND created_at > NOW() - INTERVAL '1 day' * $2`,
      [userIdHash, daysBack]
    );
    
    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (err) {
    logErrorFromCatch(err, 'legal-repository', 'getUserAuditCount');
    return 0;
  }
}

export default {
  findUserByEmail,
  getUserMessages,
  getUserAuditTrail,
  getUserProfile,
  getUserViolations,
  getAllUserData,
  userExists,
  getUserIdByEmail,
  getUserMessageCount,
  getUserAuditCount
};
