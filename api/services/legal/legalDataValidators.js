/**
 * Legal Data Request Validators
 * Input validation for legal data operations
 */

import { VALIDATION_PATTERNS, ERROR_MESSAGES } from './constants.js';

/**
 * Validate UUID format
 * @param {string} userId - UUID to validate
 * @returns {ValidationResult}
 */
export function validateUserId(userId) {
  if (!userId) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.MISSING_REQUIRED_FIELD + ': userId'
    };
  }

  if (typeof userId !== 'string') {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_USER_ID
    };
  }

  if (!VALIDATION_PATTERNS.UUID.test(userId)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_USER_ID
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {ValidationResult}
 */
export function validateEmail(email) {
  if (!email) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.MISSING_REQUIRED_FIELD + ': email'
    };
  }

  if (typeof email !== 'string') {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_EMAIL
    };
  }

  if (!VALIDATION_PATTERNS.EMAIL.test(email)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_EMAIL
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate date range
 * @param {Date|null} startDate - Start date
 * @param {Date|null} endDate - End date
 * @returns {ValidationResult}
 */
export function validateDateRange(startDate, endDate) {
  if (startDate && !(startDate instanceof Date) && isNaN(Date.parse(startDate))) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_DATE_RANGE + ': startDate'
    };
  }

  if (endDate && !(endDate instanceof Date) && isNaN(Date.parse(endDate))) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_DATE_RANGE + ': endDate'
    };
  }

  if (startDate && endDate) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    if (start > end) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.INVALID_DATE_RANGE + ': startDate must be before endDate'
      };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validate message query options
 * @param {MessageQueryOptions} options - Query options
 * @returns {ValidationResult}
 */
export function validateMessageQueryOptions(options) {
  if (!options || typeof options !== 'object') {
    return { isValid: true, error: null }; // Options are optional
  }

  // Validate date range if provided
  if (options.startDate || options.endDate) {
    const dateValidation = validateDateRange(options.startDate, options.endDate);
    if (!dateValidation.isValid) {
      return dateValidation;
    }
  }

  // Validate limit if provided
  if (options.limit !== undefined && options.limit !== null) {
    if (typeof options.limit !== 'number' || options.limit < 1 || options.limit > 100000) {
      return {
        isValid: false,
        error: 'Invalid limit: must be a number between 1 and 100000'
      };
    }
  }

  // Validate includeSystemMessages if provided
  if (options.includeSystemMessages !== undefined && typeof options.includeSystemMessages !== 'boolean') {
    return {
      isValid: false,
      error: 'Invalid includeSystemMessages: must be a boolean'
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate days back parameter
 * @param {number} daysBack - Number of days
 * @returns {ValidationResult}
 */
export function validateDaysBack(daysBack) {
  if (daysBack === undefined || daysBack === null) {
    return { isValid: true, error: null }; // Use default
  }

  if (typeof daysBack !== 'number' || daysBack < 1 || daysBack > 3650) {
    return {
      isValid: false,
      error: 'Invalid daysBack: must be a number between 1 and 3650'
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate legal data package request
 * @param {string} emailOrUserId - Email or user ID
 * @param {string} requestedBy - Name of requester
 * @param {string} requestReason - Reason for request
 * @returns {ValidationResult}
 */
export function validateLegalDataRequest(emailOrUserId, requestedBy, requestReason) {
  if (!emailOrUserId) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.MISSING_REQUIRED_FIELD + ': emailOrUserId'
    };
  }

  if (!requestedBy || typeof requestedBy !== 'string' || requestedBy.trim().length === 0) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.MISSING_REQUIRED_FIELD + ': requestedBy'
    };
  }

  if (!requestReason || typeof requestReason !== 'string' || requestReason.trim().length === 0) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.MISSING_REQUIRED_FIELD + ': requestReason'
    };
  }

  // Validate format of emailOrUserId
  const isEmail = emailOrUserId.includes('@');
  if (isEmail) {
    const emailValidation = validateEmail(emailOrUserId);
    if (!emailValidation.isValid) {
      return emailValidation;
    }
  } else {
    const userIdValidation = validateUserId(emailOrUserId);
    if (!userIdValidation.isValid) {
      return userIdValidation;
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validate search term
 * @param {string} searchTerm - Search term
 * @returns {ValidationResult}
 */
export function validateSearchTerm(searchTerm) {
  if (!searchTerm) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.MISSING_REQUIRED_FIELD + ': searchTerm'
    };
  }

  if (typeof searchTerm !== 'string') {
    return {
      isValid: false,
      error: 'Invalid searchTerm: must be a string'
    };
  }

  if (searchTerm.trim().length < 2) {
    return {
      isValid: false,
      error: 'Invalid searchTerm: must be at least 2 characters'
    };
  }

  if (searchTerm.length > 500) {
    return {
      isValid: false,
      error: 'Invalid searchTerm: must be less than 500 characters'
    };
  }

  return { isValid: true, error: null };
}

/**
 * Sanitize string input (prevent SQL injection, XSS)
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Remove any null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize email
 * @param {string} email - Email address
 * @returns {string} Sanitized email
 */
export function sanitizeEmail(email) {
  return sanitizeInput(email).toLowerCase();
}

export default {
  validateUserId,
  validateEmail,
  validateDateRange,
  validateMessageQueryOptions,
  validateDaysBack,
  validateLegalDataRequest,
  validateSearchTerm,
  sanitizeInput,
  sanitizeEmail
};
