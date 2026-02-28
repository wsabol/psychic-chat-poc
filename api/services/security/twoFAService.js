import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { getPhoneData, savePhoneNumber } from './phoneService.js';

/**
 * Get user's 2FA settings (from user_2fa_settings table + phone from security table)
 * Used by: TwoFactorAuthTab, SessionPrivacyTab
 * USES PGCRYPTO - Same as phoneService and personal info
 */
export async function get2FASettings(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    // Get 2FA settings from user_2fa_settings table
    const settingsResult = await db.query(
      `SELECT enabled, method, persistent_session 
       FROM user_2fa_settings WHERE user_id_hash = $1`,
      [userIdHash]
    );

    const settings = settingsResult.rows.length === 0 
      ? { enabled: true, method: 'email', persistent_session: false }
      : settingsResult.rows[0];

    // Get phone number from security table - DECRYPT WITH PGCRYPTO
    const phoneResult = await db.query(
      `SELECT 
        pgp_sym_decrypt(phone_number_encrypted::bytea, $1::text) as phone_number,
        phone_verified
       FROM security 
       WHERE user_id_hash = $2`,
      [ENCRYPTION_KEY, userIdHash]
    );

    // Add phone data to settings
    if (phoneResult.rows.length > 0) {
      settings.phone_number = phoneResult.rows[0].phone_number;
      settings.phone_verified = phoneResult.rows[0].phone_verified || false;
    } else {
      settings.phone_number = null;
      settings.phone_verified = false;
    }

    return settings;
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}

/**
 * Update 2FA settings (enabled & method)
 * Uses UPSERT to create row if it doesn't exist
 * Used by: TwoFactorAuthTab
 */
export async function update2FASettings(userId, { enabled, method }) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await db.query(
      `INSERT INTO user_2fa_settings (user_id_hash, enabled, method, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id_hash) DO UPDATE SET
         enabled = $2,
         method = $3,
         updated_at = NOW()
       RETURNING enabled, method, persistent_session`,
      [userIdHash, enabled, method]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to update 2FA settings');
    }
    return result.rows[0];
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}

/**
 * Get session persistence preference for a user.
 * Returns null if the user has never set a preference (no row in DB).
 * Returns true/false when the user has explicitly set it.
 * Used by: App startup check (web + mobile) to enforce logout when sessions are disabled.
 */
export async function getSessionPreference(userId) {
  try {
    const userIdHash = hashUserId(userId);

    const result = await db.query(
      `SELECT persistent_session FROM user_2fa_settings WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (result.rows.length === 0) {
      // No preference set — return null so the client defaults to staying logged in
      return null;
    }

    return result.rows[0].persistent_session;
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}

/**
 * Update session persistence preference
 * Uses UPSERT to create row if it doesn't exist
 * Used by: SessionPrivacyTab
 */
export async function updateSessionPreference(userId, persistentSession) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await db.query(
      `INSERT INTO user_2fa_settings (user_id_hash, persistent_session, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id_hash) DO UPDATE SET
         persistent_session = $2,
         updated_at = NOW()
       RETURNING persistent_session`,
      [userIdHash, persistentSession === true]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to update session preference');
    }
    return result.rows[0];
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}

/**
 * Configure 2FA: orchestrates validation, settings update, and optional phone save.
 *
 * Flow:
 *   1. If SMS method is being enabled without a new phone number, verify the user
 *      already has a verified phone on file. Throws a validation error if not.
 *   2. Persist the enabled/method settings.
 *   3. If a new phoneNumber is provided, save it (triggers SMS verification code).
 *   4. Return the freshly-fetched settings so the caller gets a consistent view.
 *
 * Throws an error with `err.isValidation = true` for user-facing validation failures
 * so the route layer can distinguish them from unexpected server errors.
 *
 * Used by: POST /api/security/2fa-settings/:userId
 */
export async function configure2FA(userId, { enabled, method, phoneNumber, backupPhoneNumber }) {
  // Guard: SMS 2FA without a new phone requires an existing verified phone
  if (enabled && method === 'sms' && !phoneNumber) {
    const existingPhone = await getPhoneData(userId);
    if (!existingPhone?.phoneNumber || !existingPhone?.phoneVerified) {
      const err = new Error(
        'Phone number is required when 2FA SMS is enabled. Please verify your phone number first.'
      );
      err.isValidation = true;
      throw err;
    }
  }

  // Persist the 2FA toggle and method choice
  await update2FASettings(userId, { enabled, method });

  // Optionally save a new phone number (will trigger an SMS verification code)
  if (phoneNumber) {
    await savePhoneNumber(userId, phoneNumber, backupPhoneNumber);
  }

  // Return a fresh read so the caller always gets up-to-date settings + phone data
  return get2FASettings(userId);
}
