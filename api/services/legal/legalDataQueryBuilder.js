/**
 * Legal Data Query Builder
 * Constructs SQL queries for legal data operations
 */

import {
  TABLES,
  USER_PROFILE_COLUMNS,
  ENCRYPTED_PROFILE_COLUMNS,
  MESSAGE_COLUMNS,
  ENCRYPTED_MESSAGE_COLUMNS,
  AUDIT_LOG_COLUMNS,
  ENCRYPTED_AUDIT_COLUMNS,
  VIOLATION_COLUMNS,
  LEGAL_AUDIT_ACTIONS
} from './constants.js';

/**
 * Build SELECT clause with encrypted column decryption
 * @param {Array} regularColumns - Regular columns
 * @param {Array} encryptedColumns - Encrypted columns with aliases
 * @param {string} encryptionKeyParam - Parameter placeholder for encryption key (e.g., '$1')
 * @returns {string} SELECT clause
 */
function buildSelectClause(regularColumns, encryptedColumns, encryptionKeyParam) {
  const regular = regularColumns.join(', ');
  const encrypted = encryptedColumns
    .map(col => `pgp_sym_decrypt(${col.name}, ${encryptionKeyParam})::text as ${col.alias}`)
    .join(', ');
  
  return [regular, encrypted].filter(Boolean).join(', ');
}

/**
 * Build query to find user by email
 * @returns {Object} Query object with sql and parameterInfo
 */
export function buildFindUserByEmailQuery() {
  const selectClause = buildSelectClause(
    ['user_id', 'created_at', 'subscription_status', 'is_suspended', 'deletion_requested_at'],
    ENCRYPTED_PROFILE_COLUMNS,
    '$1'
  );

  const sql = `
    SELECT ${selectClause}
    FROM ${TABLES.USER_PERSONAL_INFO}
    WHERE LOWER(pgp_sym_decrypt(email_encrypted, $1)::text) = $2
  `;

  return {
    sql,
    parameterInfo: {
      '$1': 'ENCRYPTION_KEY',
      '$2': 'email (lowercase)'
    }
  };
}

/**
 * Build query to get user messages
 * @param {Object} options - Query options
 * @returns {Object} Query object with sql and params array
 */
export function buildGetMessagesQuery(options = {}) {
  const {
    startDate = null,
    endDate = null,
    includeSystemMessages = true,
    limit = null
  } = options;

  const selectClause = buildSelectClause(
    MESSAGE_COLUMNS,
    ENCRYPTED_MESSAGE_COLUMNS,
    '$1'
  );

  let sql = `
    SELECT ${selectClause}
    FROM ${TABLES.MESSAGES}
    WHERE user_id_hash = $2
  `;

  const conditions = [];
  let paramIndex = 3;

  // Add date filters
  if (startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    paramIndex++;
  }

  // Filter system messages if requested
  if (!includeSystemMessages) {
    conditions.push(`role IN ('user', 'assistant')`);
  }

  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at ASC';

  if (limit) {
    sql += ` LIMIT $${paramIndex}`;
  }

  return {
    sql,
    paramCount: limit ? paramIndex : paramIndex - 1
  };
}

/**
 * Build query to get user audit trail
 * @param {number} daysBack - Days back to retrieve
 * @returns {Object} Query object
 */
export function buildGetAuditTrailQuery(daysBack) {
  const selectClause = buildSelectClause(
    AUDIT_LOG_COLUMNS,
    ENCRYPTED_AUDIT_COLUMNS,
    '$1'
  );

  const sql = `
    SELECT ${selectClause}
    FROM ${TABLES.AUDIT_LOG}
    WHERE user_id_hash = $2
      AND created_at > NOW() - INTERVAL '1 day' * $3
      AND (
        action = ANY($4)
        OR action LIKE 'USER_LOGIN_BLOCKED%'
      )
    ORDER BY created_at ASC
  `;

  return {
    sql,
    parameterInfo: {
      '$1': 'ENCRYPTION_KEY',
      '$2': 'user_id_hash',
      '$3': 'daysBack',
      '$4': 'LEGAL_AUDIT_ACTIONS array'
    }
  };
}

/**
 * Build query to get user profile
 * @returns {Object} Query object
 */
export function buildGetUserProfileQuery() {
  const selectClause = buildSelectClause(
    USER_PROFILE_COLUMNS,
    ENCRYPTED_PROFILE_COLUMNS,
    '$1'
  );

  const sql = `
    SELECT ${selectClause}
    FROM ${TABLES.USER_PERSONAL_INFO}
    WHERE user_id = $2
  `;

  return {
    sql,
    parameterInfo: {
      '$1': 'ENCRYPTION_KEY',
      '$2': 'user_id'
    }
  };
}

/**
 * Build query to get user violations
 * @returns {Object} Query object
 */
export function buildGetViolationsQuery() {
  const sql = `
    SELECT ${VIOLATION_COLUMNS.join(', ')}
    FROM ${TABLES.USER_VIOLATIONS}
    WHERE user_id_hash = $1
    ORDER BY created_at ASC
  `;

  return {
    sql,
    parameterInfo: {
      '$1': 'user_id_hash'
    }
  };
}

/**
 * Build query to search messages by content (database-level search)
 * Note: This still requires decryption but uses LIKE for better performance
 * @returns {Object} Query object
 */
export function buildSearchMessagesQuery() {
  const selectClause = buildSelectClause(
    MESSAGE_COLUMNS,
    ENCRYPTED_MESSAGE_COLUMNS,
    '$1'
  );

  const sql = `
    SELECT ${selectClause}
    FROM ${TABLES.MESSAGES}
    WHERE user_id_hash = $2
    ORDER BY created_at ASC
  `;

  return {
    sql,
    parameterInfo: {
      '$1': 'ENCRYPTION_KEY',
      '$2': 'user_id_hash'
    },
    note: 'Content filtering must be done in application layer due to encryption'
  };
}

/**
 * Get parameter placeholders for a query
 * @param {number} count - Number of parameters
 * @param {number} startIndex - Starting index (default 1)
 * @returns {Array} Array of parameter placeholders ['$1', '$2', ...]
 */
export function getParameterPlaceholders(count, startIndex = 1) {
  return Array.from({ length: count }, (_, i) => `$${startIndex + i}`);
}

/**
 * Build dynamic WHERE clause
 * @param {Object} conditions - Key-value pairs of conditions
 * @param {number} startParamIndex - Starting parameter index
 * @returns {Object} { clause: string, paramIndex: number }
 */
export function buildWhereClause(conditions, startParamIndex = 1) {
  if (!conditions || Object.keys(conditions).length === 0) {
    return { clause: '', paramIndex: startParamIndex };
  }

  const entries = Object.entries(conditions);
  const clauses = entries.map((_, index) => {
    const [key] = entries[index];
    return `${key} = $${startParamIndex + index}`;
  });

  return {
    clause: 'WHERE ' + clauses.join(' AND '),
    paramIndex: startParamIndex + entries.length
  };
}

export default {
  buildFindUserByEmailQuery,
  buildGetMessagesQuery,
  buildGetAuditTrailQuery,
  buildGetUserProfileQuery,
  buildGetViolationsQuery,
  buildSearchMessagesQuery,
  getParameterPlaceholders,
  buildWhereClause
};
