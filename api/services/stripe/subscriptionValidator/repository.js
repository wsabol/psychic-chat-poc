/**
 * Repository Layer for Subscription Validator
 * Handles all database operations
 */

import { db } from '../../../shared/db.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { DB_COLUMNS, VALIDATION_REASON } from './constants.js';

/**
 * Generic function to retrieve encrypted field from database
 * @param {string} userId - User ID
 * @param {string} fieldName - Encrypted field name
 * @param {string} context - Context for error logging
 * @returns {Promise<DatabaseQueryResult>}
 */
async function getEncryptedField(userId, fieldName, context = 'subscription-validator') {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
        reason: VALIDATION_REASON.INVALID_USER_ID
      };
    }

    if (!process.env.ENCRYPTION_KEY) {
      return {
        success: false,
        error: 'ENCRYPTION_KEY not configured',
        reason: VALIDATION_REASON.ENCRYPTION_ERROR
      };
    }

    const query = `SELECT 
      pgp_sym_decrypt(${fieldName}, $1) as decrypted_value
      FROM user_personal_info WHERE ${DB_COLUMNS.USER_ID} = $2`;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);
    
    if (result.rows.length === 0 || !result.rows[0].decrypted_value) {
      return {
        success: false,
        data: null,
        reason: 'NOT_FOUND'
      };
    }

    return {
      success: true,
      data: result.rows[0].decrypted_value
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', context, userId);
    return {
      success: false,
      error: 'Database query failed',
      reason: VALIDATION_REASON.ENCRYPTION_ERROR
    };
  }
}

/**
 * Get decrypted subscription ID from database
 * @param {string} userId - User ID
 * @returns {Promise<DatabaseQueryResult>}
 */
export async function getSubscriptionIdFromDB(userId) {
  return getEncryptedField(
    userId,
    DB_COLUMNS.STRIPE_SUBSCRIPTION_ID_ENCRYPTED,
    'subscription-id-retrieval'
  );
}

/**
 * Get decrypted customer ID from database
 * @param {string} userId - User ID
 * @returns {Promise<DatabaseQueryResult>}
 */
export async function getCustomerIdFromDB(userId) {
  return getEncryptedField(
    userId,
    DB_COLUMNS.STRIPE_CUSTOMER_ID_ENCRYPTED,
    'customer-id-retrieval'
  );
}

/**
 * Get current subscription status from database
 * @param {string} userId - User ID
 * @returns {Promise<DatabaseQueryResult>}
 */
export async function getCurrentStatusFromDB(userId) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
        reason: VALIDATION_REASON.INVALID_USER_ID
      };
    }

    const result = await db.query(
      `SELECT ${DB_COLUMNS.SUBSCRIPTION_STATUS} 
       FROM user_personal_info 
       WHERE ${DB_COLUMNS.USER_ID} = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        data: null,
        reason: 'NOT_FOUND'
      };
    }

    return {
      success: true,
      data: result.rows[0].subscription_status
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-status-retrieval', userId);
    return {
      success: false,
      error: 'Database query failed'
    };
  }
}

/**
 * Get cached subscription status with full details
 * @param {string} userId - User ID
 * @returns {Promise<DatabaseQueryResult>}
 */
export async function getCachedSubscriptionStatusFromDB(userId) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
        reason: VALIDATION_REASON.INVALID_USER_ID
      };
    }

    const result = await db.query(
      `SELECT 
        ${DB_COLUMNS.SUBSCRIPTION_STATUS}, 
        ${DB_COLUMNS.CURRENT_PERIOD_START}, 
        ${DB_COLUMNS.CURRENT_PERIOD_END},
        ${DB_COLUMNS.LAST_STATUS_CHECK_AT}
        FROM user_personal_info 
        WHERE ${DB_COLUMNS.USER_ID} = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        data: null,
        reason: 'NOT_FOUND'
      };
    }

    return {
      success: true,
      data: {
        status: result.rows[0].subscription_status,
        current_period_start: result.rows[0].current_period_start,
        current_period_end: result.rows[0].current_period_end,
        lastCheckAt: result.rows[0].last_status_check_at
      }
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'cached-subscription-retrieval', userId);
    return {
      success: false,
      error: 'Database query failed'
    };
  }
}

/**
 * Update subscription status in database
 * @param {string} userId - User ID
 * @param {SubscriptionStatusUpdate} statusUpdate - Status update data
 * @returns {Promise<DatabaseQueryResult>}
 */
export async function updateSubscriptionStatusInDB(userId, statusUpdate) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
        reason: VALIDATION_REASON.INVALID_USER_ID
      };
    }

    const query = `UPDATE user_personal_info SET 
      ${DB_COLUMNS.SUBSCRIPTION_STATUS} = $1,
      ${DB_COLUMNS.CURRENT_PERIOD_START} = $2,
      ${DB_COLUMNS.CURRENT_PERIOD_END} = $3,
      ${DB_COLUMNS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${DB_COLUMNS.USER_ID} = $4`;

    await db.query(query, [
      statusUpdate.status,
      statusUpdate.current_period_start,
      statusUpdate.current_period_end,
      userId
    ]);

    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-status-update', userId);
    return {
      success: false,
      error: 'Failed to update subscription status'
    };
  }
}

/**
 * Update last status check timestamp
 * @param {string} userId - User ID
 * @returns {Promise<DatabaseQueryResult>}
 */
export async function updateLastStatusCheckInDB(userId) {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
        reason: VALIDATION_REASON.INVALID_USER_ID
      };
    }

    await db.query(
      `UPDATE user_personal_info 
       SET ${DB_COLUMNS.LAST_STATUS_CHECK_AT} = CURRENT_TIMESTAMP 
       WHERE ${DB_COLUMNS.USER_ID} = $1`,
      [userId]
    );

    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'last-check-update', userId);
    return {
      success: false,
      error: 'Failed to update last check timestamp'
    };
  }
}

/**
 * Check if cache is still valid based on TTL
 * @param {Date} lastCheckAt - Last check timestamp
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {boolean}
 */
export function isCacheValid(lastCheckAt, ttlSeconds) {
  if (!lastCheckAt) return false;
  
  const now = new Date();
  const checkTime = new Date(lastCheckAt);
  const elapsedSeconds = (now - checkTime) / 1000;
  
  return elapsedSeconds < ttlSeconds;
}
