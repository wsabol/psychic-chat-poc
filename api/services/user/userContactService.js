/**
 * User Contact Service
 * Centralized service for retrieving encrypted user contact information
 */
import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Get user contact information (email, phone, and language preference)
 * Decrypts encrypted fields using environment encryption key
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User contact info or null if not found
 * @returns {string} return.email - User's email address
 * @returns {string|null} return.phone_number - User's phone number (if exists)
 * @returns {string} return.language - User's preferred language (defaults to 'en-US')
 */
export async function getUserContactInfo(userId) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    const query = `
      SELECT 
        pgp_sym_decrypt(upi.email_encrypted, $1) as email,
        pgp_sym_decrypt(upi.phone_number_encrypted, $2) as phone_number,
        COALESCE(up.language, 'en-US') as language
      FROM user_personal_info upi
      LEFT JOIN user_preferences up
        ON up.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
      WHERE upi.user_id = $3
    `;

    const result = await db.query(query, [
      process.env.ENCRYPTION_KEY,
      process.env.ENCRYPTION_KEY,
      userId
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      email: result.rows[0].email,
      phone_number: result.rows[0].phone_number,
      language: result.rows[0].language || 'en-US',
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'get-user-contact', userId);
    return null;
  }
}

/**
 * Get user email only
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} User's email or null
 */
export async function getUserEmail(userId) {
  const contactInfo = await getUserContactInfo(userId);
  return contactInfo?.email || null;
}

/**
 * Get user phone number only
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} User's phone number or null
 */
export async function getUserPhone(userId) {
  const contactInfo = await getUserContactInfo(userId);
  return contactInfo?.phone_number || null;
}
