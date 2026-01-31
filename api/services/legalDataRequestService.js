/**
 * Legal Data Request Service
 * Provides functions for retrieving user data for legal/compliance purposes
 * 
 * USE CASES:
 * - Subpoenas, court orders, legal discovery
 * - Liability investigations (e.g., claims about oracle responses)
 * - Regulatory compliance requests
 * 
 * SECURITY:
 * - Only accessible by verified administrators
 * - All access is logged to audit_log
 * - Chain of custody maintained
 */

import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import { getEncryptionKey } from '../shared/decryptionHelper.js';
import { logAudit } from '../shared/auditLog.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * Find user by email (for legal requests that provide email)
 * @param {string} email - User's email address
 * @returns {Promise<Object|null>} User info or null
 */
export async function findUserByEmail(email) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const emailLower = email.toLowerCase().trim();
  
  console.log('[Legal] Searching for email:', emailLower);
  
  // Search by decrypted email (email_hash is NULL in database)
  const result = await db.query(
    `SELECT user_id,
            pgp_sym_decrypt(email_encrypted, $1)::text as email,
            pgp_sym_decrypt(first_name_encrypted, $1)::text as first_name,
            pgp_sym_decrypt(last_name_encrypted, $1)::text as last_name,
            created_at,
            subscription_status,
            is_suspended,
            deletion_requested_at
     FROM user_personal_info
     WHERE LOWER(pgp_sym_decrypt(email_encrypted, $1)::text) = $2`,
    [ENCRYPTION_KEY, emailLower]
  );

  if (result.rows.length === 0) {
    console.log('[Legal] User not found');
    return null;
  }

  console.log('[Legal] User found:', result.rows[0].user_id, '-', result.rows[0].email);
  return result.rows[0];
}

/**
 * Retrieve ALL messages for a specific user (for legal discovery)
 * @param {string} userId - User's UUID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} All messages with metadata
 */
export async function getUserMessagesForLegal(userId, options = {}) {
  const {
    startDate = null,
    endDate = null,
    includeSystemMessages = true,
    limit = null
  } = options;

  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const userIdHash = hashUserId(userId);

    let query = `
      SELECT 
        id,
        role,
        pgp_sym_decrypt(content_full_encrypted, $1)::text as content_full,
        pgp_sym_decrypt(content_brief_encrypted, $1)::text as content_brief,
        language_code,
        response_type,
        content_type,
        created_at,
        created_at_local_date,
        horoscope_range,
        moon_phase
      FROM messages
      WHERE user_id_hash = $2
    `;

    const params = [ENCRYPTION_KEY, userIdHash];
    let paramIndex = 3;

    // Add date filters if provided
    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Filter out system messages if requested
    if (!includeSystemMessages) {
      query += ` AND role IN ('user', 'assistant')`;
    }

    query += ` ORDER BY created_at ASC`;

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
    }

    const result = await db.query(query, params);

    return result.rows.map(row => ({
      message_id: row.id,
      role: row.role,
      content: row.content_full || row.content_brief,
      content_brief: row.content_brief,
      language: row.language_code,
      response_type: row.response_type,
      content_type: row.content_type,
      timestamp: row.created_at,
      local_date: row.created_at_local_date,
      context: {
        horoscope_range: row.horoscope_range,
        moon_phase: row.moon_phase
      }
    }));
  } catch (err) {
    logErrorFromCatch(err, 'legal', 'getUserMessagesForLegal');
    throw err;
  }
}

/**
 * Get filtered user activity audit trail (for legal discovery)
 * Excludes repetitive login/2FA events, focuses on legally relevant actions
 * @param {string} userId - User's UUID
 * @param {number} daysBack - How many days to retrieve (default 365)
 * @returns {Promise<Array>} Filtered audit trail
 */
export async function getUserAuditTrailForLegal(userId, daysBack = 365) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  console.log('[Legal] Fetching audit trail for user:', userId);

  // Filter to only legally relevant actions
  const legallyRelevantActions = [
    'ACCOUNT_CREATED',
    'ACCOUNT_DELETED',
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_UNSUSPENDED',
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_UPDATED',
    'SUBSCRIPTION_CANCELLED',
    'PAYMENT_METHOD_ADDED',
    'PAYMENT_METHOD_UPDATED',
    'PAYMENT_FAILED',
    'VIOLATION_DETECTED',
    'VIOLATION_RESOLVED',
    'USER_BLOCKED',
    'USER_UNBLOCKED',
    'DATA_DELETION_REQUESTED',
    'DATA_EXPORT_REQUESTED',
    'LEGAL_DATA_REQUEST',
    'TERMS_ACCEPTED',
    'PRIVACY_ACCEPTED'
  ];

  const result = await db.query(
    `SELECT 
      id,
      action,
      details,
      pgp_sym_decrypt(ip_address_encrypted, $1)::text as ip_address,
      pgp_sym_decrypt(email_encrypted, $1)::text as email,
      created_at
     FROM audit_log
     WHERE user_id_hash = $2
       AND created_at > NOW() - INTERVAL '1 day' * $3
       AND (
         action = ANY($4)
         OR action LIKE 'USER_LOGIN_BLOCKED%'
       )
     ORDER BY created_at ASC`,
    [ENCRYPTION_KEY, userIdHash, daysBack, legallyRelevantActions]
  );

  console.log('[Legal] Found', result.rows.length, 'legally relevant audit events');

  return result.rows.map(row => ({
    audit_id: row.id,
    action: row.action,
    details: row.details,
    ip_address: row.ip_address,
    email: row.email,
    timestamp: row.created_at
  }));
}

/**
 * Get user profile information (for legal discovery)
 * @param {string} userId - User's UUID
 * @returns {Promise<Object>} User profile data
 */
export async function getUserProfileForLegal(userId) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();

    const result = await db.query(
      `SELECT 
        user_id,
        pgp_sym_decrypt(email_encrypted, $1)::text as email,
        email_verified,
        email_verified_at,
        created_at,
        updated_at,
        is_admin,
        is_suspended,
        suspension_end_date,
        deletion_requested_at,
        deletion_status,
        anonymization_date,
        final_deletion_date,
        deletion_reason,
        subscription_status,
        current_period_start,
        current_period_end,
        plan_name,
        price_amount,
        price_interval,
        pgp_sym_decrypt(first_name_encrypted, $1)::text as first_name,
        pgp_sym_decrypt(last_name_encrypted, $1)::text as last_name,
        pgp_sym_decrypt(birth_date_encrypted, $1)::text as birth_date,
        pgp_sym_decrypt(phone_number_encrypted, $1)::text as phone_number,
        pgp_sym_decrypt(billing_country_encrypted, $1)::text as billing_country
       FROM user_personal_info
       WHERE user_id = $2`,
      [ENCRYPTION_KEY, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (err) {
    logErrorFromCatch(err, 'legal', 'getUserProfileForLegal');
    throw err;
  }
}

/**
 * Get user violations history (for legal discovery)
 * @param {string} userId - User's UUID
 * @returns {Promise<Array>} Violation records
 */
export async function getUserViolationsForLegal(userId) {
  try {
    const userIdHash = hashUserId(userId);

    const result = await db.query(
      `SELECT 
        id,
        violation_type,
        violation_count,
        violation_message,
        severity,
        is_active,
        is_account_disabled,
        created_at,
        updated_at
       FROM user_violations
       WHERE user_id_hash = $1
       ORDER BY created_at ASC`,
      [userIdHash]
    );

    return result.rows;
  } catch (err) {
    logErrorFromCatch(err, 'legal', 'getUserViolationsForLegal');
    throw err;
  }
}

/**
 * Generate complete legal data package for a user
 * @param {string} emailOrUserId - User's email or UUID
 * @param {string} requestedBy - Admin who requested the data
 * @param {string} requestReason - Legal reason for request
 * @param {string} ipAddress - IP of admin making request
 * @returns {Promise<Object>} Complete data package
 */
export async function generateLegalDataPackage(emailOrUserId, requestedBy, requestReason, ipAddress) {
  try {
    // Determine if input is email or userId
    let userId;
    let userInfo;

    if (emailOrUserId.includes('@')) {
      // It's an email
      userInfo = await findUserByEmail(emailOrUserId);
      if (!userInfo) {
        throw new Error('User not found with provided email');
      }
      userId = userInfo.user_id;
    } else {
      // It's a userId
      userId = emailOrUserId;
      userInfo = await getUserProfileForLegal(userId);
    }

    // Log this legal data access
    await logAudit(db, {
      userId: userId,
      action: 'LEGAL_DATA_REQUEST',
      details: {
        requested_by: requestedBy,
        request_reason: requestReason,
        data_types: ['messages', 'profile', 'audit_trail', 'violations']
      },
      ipAddress: ipAddress
    });

    // Gather all data
    const [messages, auditTrail, profile, violations] = await Promise.all([
      getUserMessagesForLegal(userId),
      getUserAuditTrailForLegal(userId),
      getUserProfileForLegal(userId),
      getUserViolationsForLegal(userId)
    ]);

    // Categorize messages by type for better legal clarity
    const userInputs = messages.filter(m => m.role === 'user');
    const oracleResponses = messages.filter(m => m.role === 'assistant');
    const horoscopes = messages.filter(m => m.role === 'horoscope');
    const moonPhases = messages.filter(m => m.role === 'moon_phase');
    const cosmicWeather = messages.filter(m => m.role === 'cosmic_weather');

    console.log('[Legal] Message breakdown:', {
      user_inputs: userInputs.length,
      oracle_responses: oracleResponses.length,
      horoscopes: horoscopes.length,
      moon_phases: moonPhases.length,
      cosmic_weather: cosmicWeather.length
    });

    return {
      request_metadata: {
        requested_by: requestedBy,
        request_reason: requestReason,
        request_timestamp: new Date().toISOString(),
        user_id: userId,
        user_email: profile.email
      },
      user_profile: profile,
      messages: messages,
      audit_trail: auditTrail,
      violations: violations,
      statistics: {
        total_messages: messages.length,
        message_breakdown: {
          user_inputs: userInputs.length,
          oracle_responses: oracleResponses.length,
          horoscopes: horoscopes.length,
          moon_phases: moonPhases.length,
          cosmic_weather: cosmicWeather.length
        },
        total_audit_events: auditTrail.length,
        total_violations: violations.length,
        account_created: profile.created_at,
        account_status: profile.subscription_status
      }
    };
  } catch (err) {
    logErrorFromCatch(err, 'legal', 'generateLegalDataPackage');
    throw err;
  }
}

/**
 * Search messages by content (for legal discovery)
 * Useful when searching for specific topics/keywords across user messages
 * @param {string} userId - User's UUID
 * @param {string} searchTerm - Term to search for
 * @returns {Promise<Array>} Matching messages
 */
export async function searchUserMessagesForLegal(userId, searchTerm) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const userIdHash = hashUserId(userId);

    // Note: Searching encrypted data is challenging
    // This retrieves all messages and filters in application layer
    const allMessages = await getUserMessagesForLegal(userId);

    // Filter messages containing search term (case-insensitive)
    const searchLower = searchTerm.toLowerCase();
    const matchingMessages = allMessages.filter(msg => {
      const contentLower = (msg.content || '').toLowerCase();
      return contentLower.includes(searchLower);
    });

    return matchingMessages;
  } catch (err) {
    logErrorFromCatch(err, 'legal', 'searchUserMessagesForLegal');
    throw err;
  }
}

export default {
  findUserByEmail,
  getUserMessagesForLegal,
  getUserAuditTrailForLegal,
  getUserProfileForLegal,
  getUserViolationsForLegal,
  generateLegalDataPackage,
  searchUserMessagesForLegal
};
