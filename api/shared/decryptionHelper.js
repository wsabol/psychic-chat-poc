/**
 * Decryption Helper Utility
 * 
 * Centralizes all decryption operations for encrypted PII fields
 * Uses PostgreSQL's pgp_sym_decrypt for database-level decryption
 * 
 * Usage in queries:
 * SELECT
 *   id,
 *   decryptIpAddress(ip_address_encrypted) as ip_address
 * FROM audit_logs
 * 
 * Then in application:
 * const logs = await db.query(sqlWithDecrypt, [ENCRYPTION_KEY]);
 * logs.rows.map(row => ({ ...row, ip_address: row.ip_address }));
 */

import { db } from './db.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY === 'your_encryption_key_here') {
}

/**
 * Build SQL fragment to decrypt IP address field
 * @param {string} columnName - Column name to decrypt
 * @param {string} alias - Optional alias for the decrypted column
 * @returns {string} SQL fragment like: "pgp_sym_decrypt(ip_address_encrypted, $keyParam) as ip_address"
 */
export function decryptIpAddress(columnName, alias = null) {
  const aliasClause = alias ? ` as ${alias}` : '';
  return `pgp_sym_decrypt(${columnName}, $1)${aliasClause}`;
}

/**
 * Build SQL fragment to decrypt phone number field
 * @param {string} columnName - Column name to decrypt
 * @param {string} alias - Optional alias for the decrypted column
 * @returns {string} SQL fragment
 */
export function decryptPhoneNumber(columnName, alias = null) {
  const aliasClause = alias ? ` as ${alias}` : '';
  return `pgp_sym_decrypt(${columnName}, $1)${aliasClause}`;
}

/**
 * Build SQL fragment to decrypt email field
 * @param {string} columnName - Column name to decrypt
 * @param {string} alias - Optional alias for the decrypted column
 * @returns {string} SQL fragment
 */
export function decryptEmail(columnName, alias = null) {
  const aliasClause = alias ? ` as ${alias}` : '';
  return `pgp_sym_decrypt(${columnName}, $1)${aliasClause}`;
}

/**
 * Build SQL fragment to decrypt device name field
 * @param {string} columnName - Column name to decrypt
 * @param {string} alias - Optional alias for the decrypted column
 * @returns {string} SQL fragment
 */
export function decryptDeviceName(columnName, alias = null) {
  const aliasClause = alias ? ` as ${alias}` : '';
  return `pgp_sym_decrypt(${columnName}, $1)${aliasClause}`;
}

/**
 * Build SQL fragment to decrypt any text field
 * @param {string} columnName - Column name to decrypt
 * @param {string} alias - Optional alias for the decrypted column
 * @returns {string} SQL fragment
 */
export function decryptText(columnName, alias = null) {
  const aliasClause = alias ? ` as ${alias}` : '';
  return `pgp_sym_decrypt(${columnName}, $1)${aliasClause}`;
}

/**
 * Helper to build SELECT queries with decryption
 * 
 * @param {Array} fields - Array of field objects: { encrypted: 'column_name', alias: 'field_name', type: 'ip|email|phone|device|text' }
 * @returns {Object} { selectClause: string, params: [ENCRYPTION_KEY] }
 * 
 * @example
 * const { selectClause, params } = buildDecryptSelect([
 *   { encrypted: 'ip_address_encrypted', alias: 'ip_address', type: 'ip' },
 *   { encrypted: 'email_attempted_encrypted', alias: 'email', type: 'email' }
 * ]);
 * const query = `SELECT id, ${selectClause} FROM login_attempts WHERE user_id = $2`;
 * const result = await db.query(query, [...params, userId]);
 */
export function buildDecryptSelect(fields = []) {
  const selectClauses = fields.map(field => {
    const { encrypted, alias, type } = field;
    const aliasClause = alias ? ` as ${alias}` : '';
    
    switch (type) {
      case 'ip':
        return `pgp_sym_decrypt(${encrypted}, $1)${aliasClause}`;
      case 'email':
        return `pgp_sym_decrypt(${encrypted}, $1)${aliasClause}`;
      case 'phone':
        return `pgp_sym_decrypt(${encrypted}, $1)${aliasClause}`;
      case 'device':
        return `pgp_sym_decrypt(${encrypted}, $1)${aliasClause}`;
      case 'text':
      default:
        return `pgp_sym_decrypt(${encrypted}, $1)${aliasClause}`;
    }
  });

  return {
    selectClause: selectClauses.join(', '),
    params: [ENCRYPTION_KEY]
  };
}

/**
 * Execute a query with decryption
 * Automatically adds ENCRYPTION_KEY as first parameter
 * 
 * @param {Object} db - Database connection pool
 * @param {string} sql - SQL query (use $1 for encryption key, $2+ for other params)
 * @param {Array} params - Additional parameters (encryption key will be prepended)
 * @returns {Promise<Object>} Query result
 * 
 * @example
 * const result = await executeWithDecryption(db,
 *   'SELECT id, pgp_sym_decrypt(email_attempted_encrypted, $1) as email FROM login_attempts WHERE user_id = $2',
 *   [userId]
 * );
 */
export async function executeWithDecryption(db, sql, params = []) {
  try {
    const allParams = [ENCRYPTION_KEY, ...params];
    const result = await db.query(sql, allParams);
    return result;
  } catch (err) {
    console.error('[DECRYPTION] Query error:', err.message);
    throw err;
  }
}

/**
 * Build encryption insert/update for a specific field
 * 
 * @param {string} value - Plaintext value to encrypt
 * @param {string} columnName - Target column name
 * @returns {Object} { sqlFragment: string, param: value }
 * 
 * @example
 * const { sqlFragment, param } = buildEncryptField('192.168.1.1', 'ip_address_encrypted');
 * // Use in query: INSERT INTO audit_logs (${sqlFragment}) VALUES ($1)
 */
export function buildEncryptField(value, columnName) {
  return {
    sqlFragment: `${columnName} = pgp_sym_encrypt($1, $2)`,
    params: [value, ENCRYPTION_KEY]
  };
}

/**
 * Validate that encryption key is set
 * @returns {boolean} true if key is properly configured
 */
export function isEncryptionKeyConfigured() {
  return !!(ENCRYPTION_KEY && ENCRYPTION_KEY !== 'your_encryption_key_here');
}

/**
 * Get encryption key (for use in SQL queries)
 * @returns {string} The encryption key
 */
export function getEncryptionKey() {
  return ENCRYPTION_KEY;
}

export default {
  decryptIpAddress,
  decryptPhoneNumber,
  decryptEmail,
  decryptDeviceName,
  decryptText,
  buildDecryptSelect,
  executeWithDecryption,
  buildEncryptField,
  isEncryptionKeyConfigured,
  getEncryptionKey
};

