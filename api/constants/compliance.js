/**
 * Compliance Constants
 * 
 * Centralized constants for compliance and version management
 */

/**
 * Document types for compliance tracking
 */
export const DOCUMENT_TYPES = {
  TERMS: 'terms',
  PRIVACY: 'privacy',
  BOTH: 'both'
};

/**
 * Valid document types array for validation
 */
export const VALID_DOCUMENT_TYPES = [
  DOCUMENT_TYPES.TERMS,
  DOCUMENT_TYPES.PRIVACY,
  DOCUMENT_TYPES.BOTH
];

/**
 * Change types for version updates
 */
export const CHANGE_TYPES = {
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  PATCH: 'PATCH'
};

/**
 * Valid change types array for validation
 */
export const VALID_CHANGE_TYPES = [
  CHANGE_TYPES.MAJOR,
  CHANGE_TYPES.MINOR,
  CHANGE_TYPES.PATCH
];

/**
 * Audit log actions for compliance operations
 */
export const AUDIT_ACTIONS = {
  FLAGGED_USERS: 'ADMIN_COMPLIANCE_FLAGGED_USERS',
  SEND_NOTIFICATIONS: 'ADMIN_COMPLIANCE_SEND_NOTIFICATIONS',
  VERSION_CHANGE_RECORDED: 'COMPLIANCE_VERSION_CHANGE_RECORDED',
  VERSION_REVERTED: 'COMPLIANCE_VERSION_REVERTED',
  VERSION_REVERT_FAILED: 'COMPLIANCE_VERSION_REVERT_FAILED'
};

/**
 * Default pagination settings
 */
export const PAGINATION_DEFAULTS = {
  LIMIT: 100,
  MAX_LIMIT: 1000,
  OFFSET: 0
};

/**
 * Notification settings
 */
export const NOTIFICATION_DEFAULTS = {
  SUBJECT: 'Important: Our Terms and Policies Have Been Updated'
};

export default {
  DOCUMENT_TYPES,
  VALID_DOCUMENT_TYPES,
  CHANGE_TYPES,
  VALID_CHANGE_TYPES,
  AUDIT_ACTIONS,
  PAGINATION_DEFAULTS,
  NOTIFICATION_DEFAULTS
};
