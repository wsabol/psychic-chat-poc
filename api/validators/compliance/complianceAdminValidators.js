/**
 * Compliance Admin Validators
 * 
 * Input validation middleware for compliance admin endpoints
 */

import { 
  VALID_DOCUMENT_TYPES, 
  VALID_CHANGE_TYPES,
  PAGINATION_DEFAULTS 
} from '../../constants/compliance.js';
import { validationError } from '../../utils/responses.js';

/**
 * Validate document type parameter
 * @param {string} documentType - Document type to validate
 * @returns {boolean} True if valid
 */
export function isValidDocumentType(documentType) {
  return VALID_DOCUMENT_TYPES.includes(documentType);
}

/**
 * Validate change type parameter
 * @param {string} changeType - Change type to validate
 * @returns {boolean} True if valid
 */
export function isValidChangeType(changeType) {
  return VALID_CHANGE_TYPES.includes(changeType);
}

/**
 * Middleware: Validate flag-users request
 */
export function validateFlagUsersRequest(req, res, next) {
  const { documentType = 'both', reason } = req.body;

  if (!isValidDocumentType(documentType)) {
    return validationError(
      res, 
      `Invalid documentType. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
    );
  }

  // Reason is optional but should be string if provided
  if (reason && typeof reason !== 'string') {
    return validationError(res, 'Reason must be a string');
  }

  next();
}

/**
 * Middleware: Validate pagination parameters
 */
export function validatePaginationParams(req, res, next) {
  let { limit, offset } = req.query;

  // Parse and validate limit
  if (limit !== undefined) {
    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 1) {
      return validationError(res, 'Limit must be a positive integer');
    }
    if (limit > PAGINATION_DEFAULTS.MAX_LIMIT) {
      return validationError(
        res, 
        `Limit cannot exceed ${PAGINATION_DEFAULTS.MAX_LIMIT}`
      );
    }
  } else {
    limit = PAGINATION_DEFAULTS.LIMIT;
  }

  // Parse and validate offset
  if (offset !== undefined) {
    offset = parseInt(offset, 10);
    if (isNaN(offset) || offset < 0) {
      return validationError(res, 'Offset must be a non-negative integer');
    }
  } else {
    offset = PAGINATION_DEFAULTS.OFFSET;
  }

  // Attach validated values to request
  req.pagination = { limit, offset };
  next();
}

/**
 * Middleware: Validate send-notifications request
 */
export function validateNotificationsRequest(req, res, next) {
  const { userIds, documentType = 'both', subject, templateId } = req.body;

  // Validate documentType
  if (!isValidDocumentType(documentType)) {
    return validationError(
      res, 
      `Invalid documentType. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
    );
  }

  // Validate userIds if provided
  if (userIds !== null && userIds !== undefined) {
    if (!Array.isArray(userIds)) {
      return validationError(res, 'userIds must be an array or null');
    }
    if (userIds.length === 0) {
      return validationError(res, 'userIds array cannot be empty (use null for all users)');
    }
    if (!userIds.every(id => typeof id === 'string')) {
      return validationError(res, 'All userIds must be strings');
    }
  }

  // Validate subject if provided
  if (subject && typeof subject !== 'string') {
    return validationError(res, 'Subject must be a string');
  }

  // Validate templateId if provided
  if (templateId && typeof templateId !== 'string') {
    return validationError(res, 'templateId must be a string');
  }

  next();
}

/**
 * Middleware: Validate version-change request
 */
export function validateVersionChangeRequest(req, res, next) {
  const {
    documentType,
    oldVersion,
    newVersion,
    changeType,
    description,
    changeSummary
  } = req.body;

  // Required fields validation
  if (!documentType) {
    return validationError(res, 'documentType is required');
  }
  if (!oldVersion) {
    return validationError(res, 'oldVersion is required');
  }
  if (!newVersion) {
    return validationError(res, 'newVersion is required');
  }
  if (!changeType) {
    return validationError(res, 'changeType is required');
  }

  // Validate documentType (terms or privacy only, not both)
  if (documentType !== 'terms' && documentType !== 'privacy') {
    return validationError(res, 'documentType must be "terms" or "privacy" (not "both")');
  }

  // Validate changeType
  if (!isValidChangeType(changeType)) {
    return validationError(
      res, 
      `Invalid changeType. Must be one of: ${VALID_CHANGE_TYPES.join(', ')}`
    );
  }

  // Validate version format (semantic versioning)
  const versionRegex = /^\d+\.\d+(\.\d+)?(-[\w.]+)?$/;
  if (!versionRegex.test(oldVersion)) {
    return validationError(res, 'oldVersion must be in semantic version format (e.g., 1.0 or 1.0.0)');
  }
  if (!versionRegex.test(newVersion)) {
    return validationError(res, 'newVersion must be in semantic version format (e.g., 1.0 or 1.0.0)');
  }

  // Validate description
  if (description && typeof description !== 'string') {
    return validationError(res, 'description must be a string');
  }

  // Validate changeSummary if provided
  if (changeSummary) {
    if (typeof changeSummary !== 'object' || Array.isArray(changeSummary)) {
      return validationError(res, 'changeSummary must be an object');
    }
    const validKeys = ['added', 'modified', 'removed'];
    for (const key of validKeys) {
      if (changeSummary[key] !== undefined && !Array.isArray(changeSummary[key])) {
        return validationError(res, `changeSummary.${key} must be an array`);
      }
    }
  }

  next();
}

/**
 * Middleware: Validate revert-version request
 */
export function validateRevertVersionRequest(req, res, next) {
  const { 
    documentType,
    revokedVersion,
    revertToVersion,
    reason
  } = req.body;

  // Required fields validation
  if (!documentType) {
    return validationError(res, 'documentType is required');
  }
  if (!revokedVersion) {
    return validationError(res, 'revokedVersion is required');
  }
  if (!revertToVersion) {
    return validationError(res, 'revertToVersion is required');
  }
  if (!reason) {
    return validationError(res, 'reason is required');
  }

  // Validate documentType
  if (!isValidDocumentType(documentType)) {
    return validationError(
      res, 
      `Invalid documentType. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
    );
  }

  // Validate version format
  const versionRegex = /^\d+\.\d+(\.\d+)?(-[\w.]+)?$/;
  if (!versionRegex.test(revokedVersion)) {
    return validationError(res, 'revokedVersion must be in semantic version format');
  }
  if (!versionRegex.test(revertToVersion)) {
    return validationError(res, 'revertToVersion must be in semantic version format');
  }

  // Validate reason
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return validationError(res, 'reason must be a non-empty string');
  }

  next();
}

export default {
  validateFlagUsersRequest,
  validatePaginationParams,
  validateNotificationsRequest,
  validateVersionChangeRequest,
  validateRevertVersionRequest,
  isValidDocumentType,
  isValidChangeType
};
