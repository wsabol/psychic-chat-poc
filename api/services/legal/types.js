/**
 * Type definitions for Legal Data Request Service
 * JSDoc type definitions for better IDE support and documentation
 */

/**
 * @typedef {Object} UserSearchResult
 * @property {string} user_id - User's UUID
 * @property {string} email - User's email address
 * @property {string} first_name - User's first name
 * @property {string} last_name - User's last name
 * @property {Date} created_at - Account creation timestamp
 * @property {string} subscription_status - Current subscription status
 * @property {boolean} is_suspended - Whether account is suspended
 * @property {Date|null} deletion_requested_at - When deletion was requested
 */

/**
 * @typedef {Object} MessageQueryOptions
 * @property {Date|null} [startDate] - Filter messages after this date
 * @property {Date|null} [endDate] - Filter messages before this date
 * @property {boolean} [includeSystemMessages] - Include system messages
 * @property {number|null} [limit] - Maximum number of messages to retrieve
 */

/**
 * @typedef {Object} MessageRecord
 * @property {string} message_id - Message UUID
 * @property {string} role - Message role (user, assistant, system, etc.)
 * @property {string} content - Message content (full or brief)
 * @property {string|null} content_brief - Brief version of content
 * @property {string} language - Language code
 * @property {string|null} response_type - Type of response
 * @property {string|null} content_type - Type of content
 * @property {Date} timestamp - Message creation time
 * @property {string|null} local_date - Local date string
 * @property {Object} context - Additional context
 * @property {string|null} context.horoscope_range - Horoscope date range
 * @property {string|null} context.moon_phase - Moon phase at time
 */

/**
 * @typedef {Object} AuditTrailRecord
 * @property {string} audit_id - Audit log entry UUID
 * @property {string} action - Action type
 * @property {Object} details - Action details (JSONB)
 * @property {string|null} ip_address - IP address (decrypted)
 * @property {string|null} email - Email address (decrypted)
 * @property {Date} timestamp - When action occurred
 */

/**
 * @typedef {Object} UserProfileRecord
 * @property {string} user_id - User's UUID
 * @property {string} email - Email address
 * @property {boolean} email_verified - Email verification status
 * @property {Date|null} email_verified_at - When email was verified
 * @property {Date} created_at - Account creation date
 * @property {Date} updated_at - Last update date
 * @property {boolean} is_admin - Admin status
 * @property {boolean} is_suspended - Suspension status
 * @property {Date|null} suspension_end_date - When suspension ends
 * @property {Date|null} deletion_requested_at - Deletion request date
 * @property {string|null} deletion_status - Deletion status
 * @property {Date|null} anonymization_date - Anonymization date
 * @property {Date|null} final_deletion_date - Final deletion date
 * @property {string|null} deletion_reason - Reason for deletion
 * @property {string} subscription_status - Subscription status
 * @property {Date|null} current_period_start - Billing period start
 * @property {Date|null} current_period_end - Billing period end
 * @property {string|null} plan_name - Subscription plan name
 * @property {number|null} price_amount - Price amount
 * @property {string|null} price_interval - Billing interval
 * @property {string|null} first_name - First name
 * @property {string|null} last_name - Last name
 * @property {string|null} birth_date - Birth date
 * @property {string|null} phone_number - Phone number
 * @property {string|null} billing_country - Billing country
 */

/**
 * @typedef {Object} ViolationRecord
 * @property {string} id - Violation UUID
 * @property {string} violation_type - Type of violation
 * @property {number} violation_count - Number of violations
 * @property {string|null} violation_message - Violation message
 * @property {string} severity - Severity level
 * @property {boolean} is_active - Whether violation is active
 * @property {boolean} is_account_disabled - Account disabled status
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} LegalDataPackageMetadata
 * @property {string} requested_by - Name of person requesting data
 * @property {string} request_reason - Legal reason for request
 * @property {string} request_timestamp - ISO timestamp of request
 * @property {string} user_id - Subject user's UUID
 * @property {string} user_email - Subject user's email
 */

/**
 * @typedef {Object} LegalDataStatistics
 * @property {number} total_messages - Total message count
 * @property {Object} message_breakdown - Breakdown by message type
 * @property {number} message_breakdown.user_inputs - User messages
 * @property {number} message_breakdown.oracle_responses - Assistant responses
 * @property {number} message_breakdown.horoscopes - Horoscope messages
 * @property {number} message_breakdown.moon_phases - Moon phase messages
 * @property {number} message_breakdown.cosmic_weather - Cosmic weather messages
 * @property {number} total_audit_events - Total audit events
 * @property {number} total_violations - Total violations
 * @property {Date} account_created - Account creation date
 * @property {string} account_status - Current account status
 */

/**
 * @typedef {Object} LegalDataPackage
 * @property {LegalDataPackageMetadata} request_metadata - Request metadata
 * @property {UserProfileRecord} user_profile - Complete user profile
 * @property {MessageRecord[]} messages - All user messages
 * @property {AuditTrailRecord[]} audit_trail - Filtered audit trail
 * @property {ViolationRecord[]} violations - Violation history
 * @property {LegalDataStatistics} statistics - Summary statistics
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string|null} error - Error message if validation failed
 */

export default {};
