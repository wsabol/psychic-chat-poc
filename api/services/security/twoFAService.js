import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

/**
 * Get user's 2FA settings (from user_2fa_settings table)
 * Used by: TwoFactorAuthTab, SessionPrivacyTab
 */
export async function get2FASettings(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT enabled, method, persistent_session 
       FROM user_2fa_settings WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (result.rows.length === 0) {
      return { enabled: true, method: 'email', persistent_session: false };
    }

    return result.rows[0];
  } catch (err) {
    console.error('[SECURITY] Error getting 2FA settings:', err);
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
    console.error('[SECURITY] Error updating 2FA settings:', err);
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
    console.error('[SECURITY] Error updating session preference:', err);
    throw err;
  }
}
