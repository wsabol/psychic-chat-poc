import { db } from '../../../shared/db.js';

/**
 * Create user database records (personal info, 2FA settings, astrology)
 * Used in registration and login flows
 */
export async function createUserDatabaseRecords(userId, email, firstName = '', lastName = '') {
  try {
    // Check if user already exists
    const existsCheck = await db.query(
      'SELECT user_id FROM user_personal_info WHERE user_id = $1',
      [userId]
    );

    if (existsCheck.rows.length === 0) {
      // Create personal info only if doesn't exist
      await db.query(
        `INSERT INTO user_personal_info (user_id, email_encrypted, first_name_encrypted, last_name_encrypted, created_at, updated_at)
         VALUES ($1, pgp_sym_encrypt($2, $3), pgp_sym_encrypt($4, $5), pgp_sym_encrypt($6, $7), NOW(), NOW())`,
        [userId, email, process.env.ENCRYPTION_KEY, firstName, process.env.ENCRYPTION_KEY, lastName, process.env.ENCRYPTION_KEY]
      );
    }

    // Create 2FA settings (check if exists first)
    const twoFAExists = await db.query(
      'SELECT user_id FROM user_2fa_settings WHERE user_id = $1',
      [userId]
    );
    
    if (twoFAExists.rows.length === 0) {
      await db.query(
        `INSERT INTO user_2fa_settings (user_id, enabled, method, created_at, updated_at)
         VALUES ($1, true, 'email', NOW(), NOW())`,
        [userId]
      );
    }

    // Create astrology profile (check if exists first)
    const astrologyExists = await db.query(
      'SELECT user_id FROM user_astrology WHERE user_id = $1',
      [userId]
    );
    
    if (astrologyExists.rows.length === 0) {
      await db.query(
        `INSERT INTO user_astrology (user_id, created_at, updated_at)
         VALUES ($1, NOW(), NOW())`,
        [userId]
      );
    }

    return { success: true };
  } catch (err) {
    throw new Error(`Failed to create user records: ${err.message}`);
  }
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId) {
  try {
    const result = await db.query(
      `SELECT user_id, pgp_sym_decrypt(email_encrypted, $1) as email, pgp_sym_decrypt(first_name_encrypted, $2) as first_name, pgp_sym_decrypt(last_name_encrypted, $3) as last_name, created_at, updated_at 
       FROM user_personal_info 
       WHERE user_id = $4`,
      [process.env.ENCRYPTION_KEY, process.env.ENCRYPTION_KEY, process.env.ENCRYPTION_KEY, userId]
    );
    
    return result.rows[0] || null;
  } catch (err) {
    throw new Error(`Failed to get user profile: ${err.message}`);
  }
}

/**
 * Anonymize/delete user database records
 */
export async function anonymizeUser(userId) {
  try {
    await db.query(
      `UPDATE user_personal_info 
       SET first_name_encrypted = pgp_sym_encrypt('DELETED', $1),
           last_name_encrypted = pgp_sym_encrypt('DELETED', $2),
           email_encrypted = pgp_sym_encrypt($3, $4),
           updated_at = NOW()
       WHERE user_id = $5`,
      [process.env.ENCRYPTION_KEY, process.env.ENCRYPTION_KEY, `deleted_${userId}@deleted.local`, process.env.ENCRYPTION_KEY, userId]
    );

    // Delete associated data
    await db.query('DELETE FROM messages WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM user_astrology WHERE user_id = $1', [userId]);

    return { success: true };
  } catch (err) {
    throw new Error(`Failed to anonymize user: ${err.message}`);
  }
}
