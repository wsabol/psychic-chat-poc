/**
 * Legal Data Request Constants
 * Centralized constants for legal data operations
 */

/**
 * Legally relevant audit actions that should be included in legal data packages
 */
export const LEGAL_AUDIT_ACTIONS = [
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

/**
 * Message role types
 */
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  HOROSCOPE: 'horoscope',
  MOON_PHASE: 'moon_phase',
  COSMIC_WEATHER: 'cosmic_weather'
};

/**
 * Default query limits
 */
export const DEFAULT_LIMITS = {
  MESSAGES: 10000,      // Maximum messages to retrieve
  AUDIT_TRAIL: 5000,    // Maximum audit events
  DAYS_BACK: 365        // Default days back for audit trail
};

/**
 * Database table names
 */
export const TABLES = {
  USER_PERSONAL_INFO: 'user_personal_info',
  MESSAGES: 'messages',
  AUDIT_LOG: 'audit_log',
  USER_VIOLATIONS: 'user_violations'
};

/**
 * User profile columns to retrieve
 */
export const USER_PROFILE_COLUMNS = [
  'user_id',
  'email_verified',
  'email_verified_at',
  'created_at',
  'updated_at',
  'is_admin',
  'is_suspended',
  'suspension_end_date',
  'deletion_requested_at',
  'deletion_status',
  'anonymization_date',
  'final_deletion_date',
  'deletion_reason',
  'subscription_status',
  'current_period_start',
  'current_period_end',
  'plan_name',
  'price_amount',
  'price_interval'
];

/**
 * Encrypted profile columns that need decryption
 */
export const ENCRYPTED_PROFILE_COLUMNS = [
  { name: 'email_encrypted', alias: 'email' },
  { name: 'first_name_encrypted', alias: 'first_name' },
  { name: 'last_name_encrypted', alias: 'last_name' },
  { name: 'birth_date_encrypted', alias: 'birth_date' },
  { name: 'phone_number_encrypted', alias: 'phone_number' },
  { name: 'billing_country_encrypted', alias: 'billing_country' }
];

/**
 * Message columns to retrieve
 */
export const MESSAGE_COLUMNS = [
  'id',
  'role',
  'language_code',
  'response_type',
  'content_type',
  'created_at',
  'created_at_local_date',
  'horoscope_range',
  'moon_phase'
];

/**
 * Encrypted message columns
 */
export const ENCRYPTED_MESSAGE_COLUMNS = [
  { name: 'content_full_encrypted', alias: 'content_full' },
  { name: 'content_brief_encrypted', alias: 'content_brief' }
];

/**
 * Audit log columns
 */
export const AUDIT_LOG_COLUMNS = [
  'id',
  'action',
  'details',
  'created_at'
];

/**
 * Encrypted audit log columns
 */
export const ENCRYPTED_AUDIT_COLUMNS = [
  { name: 'ip_address_encrypted', alias: 'ip_address' },
  { name: 'email_encrypted', alias: 'email' }
];

/**
 * Violation columns
 */
export const VIOLATION_COLUMNS = [
  'id',
  'violation_type',
  'violation_count',
  'violation_message',
  'severity',
  'is_active',
  'is_account_disabled',
  'created_at',
  'updated_at'
];

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  INVALID_USER_ID: 'Invalid user ID format',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_DATE_RANGE: 'Invalid date range',
  MISSING_REQUIRED_FIELD: 'Missing required field',
  DATABASE_ERROR: 'Database operation failed',
  ENCRYPTION_ERROR: 'Encryption/decryption failed'
};

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};
