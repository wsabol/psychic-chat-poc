import crypto from 'crypto';

// IMPORTANT: Get encryption key from environment variable
// In production, this should be a strong, randomly-generated key
// Store it in .env file or secret manager (NOT in code)
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your_encryption_key_here';

if (ENCRYPTION_KEY === 'your_encryption_key_here') {
}

/**
 * Helper to decrypt data from database using PostgreSQL pgp_sym_decrypt
 * Database should return data already decrypted if using decrypt_* functions
 * This is here for reference - typically decryption happens in SQL
 */
export const decryptField = (encrypted, fieldType = 'text') => {
  if (!encrypted) return null;
  
  try {
    // PostgreSQL pgp_sym_decrypt returns VARCHAR/TEXT
    // The database handles decryption, we just return the value
    return encrypted;
  } catch (err) {
    logErrorFromCatch(error, 'app', 'Error handling');
    return null;
  }
};

/**
 * When updating data, format it for PostgreSQL pgp_sym_encrypt
 * PostgreSQL's pgcrypto handles encryption in the database
 */
export const encryptForStorage = (value) => {
  // Value will be encrypted by PostgreSQL function in the query
  // We just return the value as-is for the SQL function to encrypt
  return value || '';
};

/**
 * Helper function to build SQL queries with encryption
 */
export const buildEncryptedUpdateQuery = (updates) => {
  /**
   * Example:
   * buildEncryptedUpdateQuery({
   *   email: 'test@example.com',
   *   first_name: 'John'
   * })
   * 
   * Returns SQL string like:
   * email = pgp_sym_encrypt('test@example.com', 'key'),
   * first_name = pgp_sym_encrypt('John', 'key')
   */
  const encryptedFields = [];
  const params = [];
  let paramIndex = 1;
  
  for (const [field, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      encryptedFields.push(`${field} = pgp_sym_encrypt($${paramIndex}, '${ENCRYPTION_KEY}')`);
      params.push(value);
      paramIndex++;
    }
  }
  
  return { encryptedFields, params };
};

/**
 * Query helper for selecting encrypted fields with automatic decryption
 * Use in SELECT queries to decrypt data
 */
export const buildDecryptedSelectFields = (fields = []) => {
  /**
   * Example:
   * buildDecryptedSelectFields(['email', 'first_name', 'birth_date'])
   * 
   * Returns SQL like:
   * decrypt_email(email) as email,
   * decrypt_text(first_name) as first_name,
   * decrypt_text(birth_date) as birth_date
   */
  const decryptedFields = fields.map(field => {
    switch (field) {
      case 'email':
        return `decrypt_email(${field}) as ${field}`;
      case 'birth_date':
        return `decrypt_birth_date(${field}) as ${field}`;
      case 'first_name':
      case 'last_name':
      case 'birth_city':
      case 'birth_timezone':
      case 'birth_country':
      case 'birth_province':
        return `decrypt_text(${field}) as ${field}`;
      default:
        return field;
    }
  });
  
  return decryptedFields.join(', ');
};

export default {
  ENCRYPTION_KEY,
  decryptField,
  encryptForStorage,
  buildEncryptedUpdateQuery,
  buildDecryptedSelectFields
};
