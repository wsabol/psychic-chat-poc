/**
 * Legal Data Request Service (Main Service Layer)
 * Provides high-level functions for retrieving user data for legal/compliance purposes
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
 * 
 * REFACTORED ARCHITECTURE:
 * - Validators: Input validation and sanitization
 * - Repository: Database operations
 * - Transformers: Data formatting and transformation
 * - Service: Business logic and orchestration (this file)
 */

import { db } from '../../shared/db.js';
import { logAudit } from '../../shared/auditLog.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

import {
  validateUserId,
  validateEmail,
  validateMessageQueryOptions,
  validateDaysBack,
  validateLegalDataRequest,
  validateSearchTerm,
  sanitizeEmail
} from './legalDataValidators.js';

import {
  findUserByEmail as repoFindUserByEmail,
  getUserMessages as repoGetUserMessages,
  getUserAuditTrail as repoGetUserAuditTrail,
  getUserProfile as repoGetUserProfile,
  getUserViolations as repoGetUserViolations,
  getAllUserData,
  getUserIdByEmail
} from './legalDataRepository.js';

import {
  buildLegalDataPackage,
  filterMessagesBySearchTerm
} from './legalDataTransformers.js';

import { DEFAULT_LIMITS, ERROR_MESSAGES } from './constants.js';

/**
 * Find user by email (for legal requests that provide email)
 * @param {string} email - User's email address
 * @returns {Promise<UserSearchResult|null>} User info or null
 * @throws {Error} If validation fails or database error occurs
 */
export async function findUserByEmail(email) {
  // Validate input
  const validation = validateEmail(email);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const sanitizedEmail = sanitizeEmail(email);
  return await repoFindUserByEmail(sanitizedEmail);
}

/**
 * Retrieve ALL messages for a specific user (for legal discovery)
 * @param {string} userId - User's UUID
 * @param {MessageQueryOptions} options - Query options
 * @returns {Promise<MessageRecord[]>} All messages with metadata
 * @throws {Error} If validation fails or database error occurs
 */
export async function getUserMessagesForLegal(userId, options = {}) {
  // Validate user ID
  const userIdValidation = validateUserId(userId);
  if (!userIdValidation.isValid) {
    throw new Error(userIdValidation.error);
  }

  // Validate options
  const optionsValidation = validateMessageQueryOptions(options);
  if (!optionsValidation.isValid) {
    throw new Error(optionsValidation.error);
  }

  try {
    return await repoGetUserMessages(userId, options);
  } catch (err) {
    logErrorFromCatch(err, 'legal-service', 'getUserMessagesForLegal');
    throw err;
  }
}

/**
 * Get filtered user activity audit trail (for legal discovery)
 * Excludes repetitive login/2FA events, focuses on legally relevant actions
 * @param {string} userId - User's UUID
 * @param {number} daysBack - How many days to retrieve (default 365)
 * @returns {Promise<AuditTrailRecord[]>} Filtered audit trail
 * @throws {Error} If validation fails or database error occurs
 */
export async function getUserAuditTrailForLegal(userId, daysBack = DEFAULT_LIMITS.DAYS_BACK) {
  // Validate user ID
  const userIdValidation = validateUserId(userId);
  if (!userIdValidation.isValid) {
    throw new Error(userIdValidation.error);
  }

  // Validate daysBack
  const daysValidation = validateDaysBack(daysBack);
  if (!daysValidation.isValid) {
    throw new Error(daysValidation.error);
  }

  try {
    return await repoGetUserAuditTrail(userId, daysBack);
  } catch (err) {
    logErrorFromCatch(err, 'legal-service', 'getUserAuditTrailForLegal');
    throw err;
  }
}

/**
 * Get user profile information (for legal discovery)
 * @param {string} userId - User's UUID
 * @returns {Promise<UserProfileRecord>} User profile data
 * @throws {Error} If validation fails or database error occurs
 */
export async function getUserProfileForLegal(userId) {
  // Validate user ID
  const userIdValidation = validateUserId(userId);
  if (!userIdValidation.isValid) {
    throw new Error(userIdValidation.error);
  }

  try {
    return await repoGetUserProfile(userId);
  } catch (err) {
    logErrorFromCatch(err, 'legal-service', 'getUserProfileForLegal');
    throw err;
  }
}

/**
 * Get user violations history (for legal discovery)
 * @param {string} userId - User's UUID
 * @returns {Promise<ViolationRecord[]>} Violation records
 * @throws {Error} If validation fails or database error occurs
 */
export async function getUserViolationsForLegal(userId) {
  // Validate user ID
  const userIdValidation = validateUserId(userId);
  if (!userIdValidation.isValid) {
    throw new Error(userIdValidation.error);
  }

  try {
    return await repoGetUserViolations(userId);
  } catch (err) {
    logErrorFromCatch(err, 'legal-service', 'getUserViolationsForLegal');
    throw err;
  }
}

/**
 * Generate complete legal data package for a user
 * @param {string} emailOrUserId - User's email or UUID
 * @param {string} requestedBy - Admin who requested the data
 * @param {string} requestReason - Legal reason for request
 * @param {string} ipAddress - IP of admin making request
 * @returns {Promise<LegalDataPackage>} Complete data package
 * @throws {Error} If validation fails or database error occurs
 */
export async function generateLegalDataPackage(emailOrUserId, requestedBy, requestReason, ipAddress) {
  // Validate request parameters
  const validation = validateLegalDataRequest(emailOrUserId, requestedBy, requestReason);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    // Determine if input is email or userId
    let userId;
    const isEmail = emailOrUserId.includes('@');

    if (isEmail) {
      // It's an email - find the user first
      const sanitizedEmail = sanitizeEmail(emailOrUserId);
      userId = await getUserIdByEmail(sanitizedEmail);
      
      if (!userId) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND + ' with provided email');
      }
    } else {
      // It's a userId
      userId = emailOrUserId;
    }

    // Log this legal data access BEFORE retrieving data
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

    // Gather all data in parallel
    const data = await getAllUserData(userId);

    // Build complete package with metadata
    const dataPackage = buildLegalDataPackage(data, {
      requestedBy,
      requestReason,
      timestamp: new Date().toISOString()
    });

    return dataPackage;
  } catch (err) {
    logErrorFromCatch(err, 'legal-service', 'generateLegalDataPackage');
    throw err;
  }
}

/**
 * Search messages by content (for legal discovery)
 * Useful when searching for specific topics/keywords across user messages
 * @param {string} userId - User's UUID
 * @param {string} searchTerm - Term to search for
 * @returns {Promise<MessageRecord[]>} Matching messages
 * @throws {Error} If validation fails or database error occurs
 */
export async function searchUserMessagesForLegal(userId, searchTerm) {
  // Validate user ID
  const userIdValidation = validateUserId(userId);
  if (!userIdValidation.isValid) {
    throw new Error(userIdValidation.error);
  }

  // Validate search term
  const searchValidation = validateSearchTerm(searchTerm);
  if (!searchValidation.isValid) {
    throw new Error(searchValidation.error);
  }

  try {
    // Retrieve all messages (encrypted search requires client-side filtering)
    const allMessages = await repoGetUserMessages(userId, {});

    // Filter messages by search term
    const matchingMessages = filterMessagesBySearchTerm(allMessages, searchTerm);

    return matchingMessages;
  } catch (err) {
    logErrorFromCatch(err, 'legal-service', 'searchUserMessagesForLegal');
    throw err;
  }
}

// Default export for backward compatibility and easy imports
export default {
  findUserByEmail,
  getUserMessagesForLegal,
  getUserAuditTrailForLegal,
  getUserProfileForLegal,
  getUserViolationsForLegal,
  generateLegalDataPackage,
  searchUserMessagesForLegal
};
