/**
 * Legal Data Transformers
 * Transforms raw database results into consistent DTOs
 */

import { MESSAGE_ROLES } from './constants.js';

/**
 * Transform raw message row to MessageRecord DTO
 * @param {Object} row - Raw database row
 * @returns {MessageRecord}
 */
export function transformMessageRow(row) {
  return {
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
      horoscope_range: row.horoscope_range || null,
      moon_phase: row.moon_phase || null
    }
  };
}

/**
 * Transform raw audit log row to AuditTrailRecord DTO
 * @param {Object} row - Raw database row
 * @returns {AuditTrailRecord}
 */
export function transformAuditRow(row) {
  return {
    audit_id: row.id,
    action: row.action,
    details: row.details || {},
    ip_address: row.ip_address || null,
    email: row.email || null,
    timestamp: row.created_at
  };
}

/**
 * Transform raw user profile row to UserProfileRecord DTO
 * @param {Object} row - Raw database row
 * @returns {UserProfileRecord}
 */
export function transformUserProfileRow(row) {
  return {
    user_id: row.user_id,
    email: row.email,
    email_verified: row.email_verified,
    email_verified_at: row.email_verified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_admin: row.is_admin,
    is_suspended: row.is_suspended,
    suspension_end_date: row.suspension_end_date,
    deletion_requested_at: row.deletion_requested_at,
    deletion_status: row.deletion_status,
    anonymization_date: row.anonymization_date,
    final_deletion_date: row.final_deletion_date,
    deletion_reason: row.deletion_reason,
    subscription_status: row.subscription_status,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    plan_name: row.plan_name,
    price_amount: row.price_amount,
    price_interval: row.price_interval,
    first_name: row.first_name,
    last_name: row.last_name,
    birth_date: row.birth_date,
    phone_number: row.phone_number,
    billing_country: row.billing_country
  };
}

/**
 * Transform raw violation row to ViolationRecord DTO
 * @param {Object} row - Raw database row
 * @returns {ViolationRecord}
 */
export function transformViolationRow(row) {
  return {
    id: row.id,
    violation_type: row.violation_type,
    violation_count: row.violation_count,
    violation_message: row.violation_message,
    severity: row.severity,
    is_active: row.is_active,
    is_account_disabled: row.is_account_disabled,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Transform user search result to simplified DTO
 * @param {Object} row - Raw database row
 * @returns {UserSearchResult}
 */
export function transformUserSearchResult(row) {
  return {
    user_id: row.user_id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    created_at: row.created_at,
    subscription_status: row.subscription_status,
    is_suspended: row.is_suspended,
    deletion_requested_at: row.deletion_requested_at
  };
}

/**
 * Calculate message statistics by role
 * @param {MessageRecord[]} messages - Array of messages
 * @returns {Object} Statistics breakdown
 */
export function calculateMessageStatistics(messages) {
  const breakdown = {
    user_inputs: 0,
    oracle_responses: 0,
    horoscopes: 0,
    moon_phases: 0,
    cosmic_weather: 0,
    system: 0,
    other: 0
  };

  messages.forEach(msg => {
    switch (msg.role) {
      case MESSAGE_ROLES.USER:
        breakdown.user_inputs++;
        break;
      case MESSAGE_ROLES.ASSISTANT:
        breakdown.oracle_responses++;
        break;
      case MESSAGE_ROLES.HOROSCOPE:
        breakdown.horoscopes++;
        break;
      case MESSAGE_ROLES.MOON_PHASE:
        breakdown.moon_phases++;
        break;
      case MESSAGE_ROLES.COSMIC_WEATHER:
        breakdown.cosmic_weather++;
        break;
      case MESSAGE_ROLES.SYSTEM:
        breakdown.system++;
        break;
      default:
        breakdown.other++;
    }
  });

  return breakdown;
}

/**
 * Build complete legal data package
 * @param {Object} data - Raw data components
 * @param {Object} metadata - Request metadata
 * @returns {LegalDataPackage}
 */
export function buildLegalDataPackage(data, metadata) {
  const { messages, auditTrail, profile, violations } = data;
  
  const messageBreakdown = calculateMessageStatistics(messages);

  return {
    request_metadata: {
      requested_by: metadata.requestedBy,
      request_reason: metadata.requestReason,
      request_timestamp: metadata.timestamp || new Date().toISOString(),
      user_id: profile.user_id,
      user_email: profile.email
    },
    user_profile: profile,
    messages: messages,
    audit_trail: auditTrail,
    violations: violations,
    statistics: {
      total_messages: messages.length,
      message_breakdown: messageBreakdown,
      total_audit_events: auditTrail.length,
      total_violations: violations.length,
      account_created: profile.created_at,
      account_status: profile.subscription_status
    }
  };
}

/**
 * Categorize messages by type for legal analysis
 * @param {MessageRecord[]} messages - Array of messages
 * @returns {Object} Categorized messages
 */
export function categorizeMessages(messages) {
  return {
    all: messages,
    userInputs: messages.filter(m => m.role === MESSAGE_ROLES.USER),
    oracleResponses: messages.filter(m => m.role === MESSAGE_ROLES.ASSISTANT),
    horoscopes: messages.filter(m => m.role === MESSAGE_ROLES.HOROSCOPE),
    moonPhases: messages.filter(m => m.role === MESSAGE_ROLES.MOON_PHASE),
    cosmicWeather: messages.filter(m => m.role === MESSAGE_ROLES.COSMIC_WEATHER),
    system: messages.filter(m => m.role === MESSAGE_ROLES.SYSTEM)
  };
}

/**
 * Filter messages by search term (case-insensitive)
 * @param {MessageRecord[]} messages - Array of messages
 * @param {string} searchTerm - Term to search for
 * @returns {MessageRecord[]} Filtered messages
 */
export function filterMessagesBySearchTerm(messages, searchTerm) {
  const searchLower = searchTerm.toLowerCase();
  
  return messages.filter(msg => {
    const contentLower = (msg.content || '').toLowerCase();
    const contentBriefLower = (msg.content_brief || '').toLowerCase();
    
    return contentLower.includes(searchLower) || contentBriefLower.includes(searchLower);
  });
}

/**
 * Sort messages by timestamp
 * @param {MessageRecord[]} messages - Array of messages
 * @param {string} order - 'asc' or 'desc'
 * @returns {MessageRecord[]} Sorted messages
 */
export function sortMessages(messages, order = 'asc') {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return order === 'asc' ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Redact sensitive information from messages (for partial disclosure)
 * @param {MessageRecord[]} messages - Array of messages
 * @param {Object} redactionRules - Rules for redaction
 * @returns {MessageRecord[]} Redacted messages
 */
export function redactSensitiveContent(messages, redactionRules = {}) {
  const {
    redactEmails = false,
    redactPhones = false,
    redactNames = false
  } = redactionRules;

  return messages.map(msg => {
    let content = msg.content;

    if (redactEmails) {
      content = content.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL REDACTED]');
    }

    if (redactPhones) {
      content = content.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REDACTED]');
    }

    if (redactNames && msg.first_name && msg.last_name) {
      const namePattern = new RegExp(`${msg.first_name}|${msg.last_name}`, 'gi');
      content = content.replace(namePattern, '[NAME REDACTED]');
    }

    return {
      ...msg,
      content
    };
  });
}

export default {
  transformMessageRow,
  transformAuditRow,
  transformUserProfileRow,
  transformViolationRow,
  transformUserSearchResult,
  calculateMessageStatistics,
  buildLegalDataPackage,
  categorizeMessages,
  filterMessagesBySearchTerm,
  sortMessages,
  redactSensitiveContent
};
