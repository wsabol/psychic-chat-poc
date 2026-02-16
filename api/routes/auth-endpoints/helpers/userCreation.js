import { db } from '../../../shared/db.js';
import { hashUserId } from '../../../shared/hashUtils.js';
import { recordUserConsent } from './consentHelper.js';

/**
 * Create user database records (personal info, 2FA settings, astrology)
 * Used in registration and login flows
 * 
 * New users start with onboarding_step='create_account' and onboarding_completed=FALSE
 * Established users have onboarding_completed=TRUE (set by migration)
 */
export async function createUserDatabaseRecords(userId, email, firstName = '', lastName = '') {
  try {
    // Check if user already exists
    const existsCheck = await db.query(
      'SELECT user_id, is_admin FROM user_personal_info WHERE user_id = $1',
      [userId]
    );

    if (existsCheck.rows.length === 0) {
      // CRITICAL BUSINESS PROTECTION: For temp users, ALWAYS set first_name to "Seeker"
      // This is Layer 4 of our quadruple redundancy system to prevent temp user IDs
      // from ever being shown to customers in oracle greetings
      const isTempUser = userId.startsWith('temp_');
      const actualFirstName = isTempUser ? 'Seeker' : (firstName || '');
      const actualLastName = isTempUser ? '' : (lastName || '');
      
      // Create personal info for new user - mark as in onboarding
      // Use ON CONFLICT DO NOTHING to handle race conditions
      await db.query(
        `INSERT INTO user_personal_info (
          user_id, email_encrypted, first_name_encrypted, last_name_encrypted,
          onboarding_step, onboarding_completed, onboarding_started_at,
          created_at, updated_at
        ) VALUES (
          $1, pgp_sym_encrypt($2, $3), pgp_sym_encrypt($4, $5), pgp_sym_encrypt($6, $7),
          $8, $9, NOW(),
          NOW(), NOW()
        )
        ON CONFLICT (user_id) DO NOTHING`,
        [
          userId, 
          email, process.env.ENCRYPTION_KEY, 
          actualFirstName, process.env.ENCRYPTION_KEY, 
          actualLastName, process.env.ENCRYPTION_KEY,
          'create_account', // New users start at step 1
          false  // Not yet completed onboarding
        ]
      );
    }

    // Create 2FA settings (check if exists first) - uses user_id_hash
    const userIdHash = hashUserId(userId);
    const twoFAExists = await db.query(
      'SELECT user_id_hash FROM user_2fa_settings WHERE user_id_hash = $1',
      [userIdHash]
    );
    
    if (twoFAExists.rows.length === 0) {
      await db.query(
        `INSERT INTO user_2fa_settings (user_id_hash, enabled, method, created_at, updated_at)
         VALUES ($1, true, 'email', NOW(), NOW())
         ON CONFLICT (user_id_hash) DO NOTHING`,
        [userIdHash]
      );
    }

    // Create astrology profile (check if exists first) - uses user_id_hash only
    const astrologyExists = await db.query(
      'SELECT user_id_hash FROM user_astrology WHERE user_id_hash = $1',
      [userIdHash]
    );
    
    if (astrologyExists.rows.length === 0) {
      await db.query(
        `INSERT INTO user_astrology (user_id_hash, created_at, updated_at)
         VALUES ($1, NOW(), NOW())
         ON CONFLICT (user_id_hash) DO NOTHING`,
        [userIdHash]
      );
    }

    return { success: true };
  } catch (err) {
    // Handle duplicate key errors gracefully - this is expected when user already exists
    if (err.code === '23505') { // PostgreSQL unique violation error code
      console.log(`[USER-CREATION] User ${userId} already exists, skipping creation`);
      return { success: true, alreadyExists: true };
    }
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
    const userIdHash = hashUserId(userId);
    await db.query('DELETE FROM messages WHERE user_id_hash = $1', [userIdHash]);
    await db.query('DELETE FROM user_astrology WHERE user_id_hash = $1', [userIdHash]);

    return { success: true };
  } catch (err) {
    throw new Error(`Failed to anonymize user: ${err.message}`);
  }
}
