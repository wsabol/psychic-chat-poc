import { db } from '../../../shared/db.js';

/**
 * Create user database records (personal info, 2FA settings, astrology)
 * Used in registration and login flows
 */
export async function createUserDatabaseRecords(userId, email, firstName = '', lastName = '') {
  try {
    // Create personal info
    await db.query(
      `INSERT INTO user_personal_info (user_id, email_encrypted, first_name_encrypted, last_name_encrypted, created_at, updated_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, email, process.env.ENCRYPTION_KEY, firstName, lastName]
    );

    // Create 2FA settings
    await db.query(
      `INSERT INTO user_2fa_settings (user_id, enabled, method, created_at, updated_at)
       VALUES ($1, true, 'email', NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Create astrology profile
    await db.query(
      `INSERT INTO user_astrology (user_id, created_at, updated_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

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
      `SELECT user_id, pgp_sym_decrypt(email_encrypted, $1) as email, first_name_encrypted, last_name_encrypted, created_at, updated_at 
       FROM user_personal_info 
       WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
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
       SET first_name = 'DELETED', 
           last_name = 'DELETED',
           email_encrypted = pgp_sym_encrypt($1, $2),
           updated_at = NOW()
       WHERE user_id = $3`,
      [`deleted_${userId}@deleted.local`, process.env.ENCRYPTION_KEY, userId]
    );

    // Delete associated data
    await db.query('DELETE FROM messages WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM user_astrology WHERE user_id = $1', [userId]);

    return { success: true };
  } catch (err) {
    throw new Error(`Failed to anonymize user: ${err.message}`);
  }
}
