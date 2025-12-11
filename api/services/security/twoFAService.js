import { db } from '../../shared/db.js';

/**
 * Get user's 2FA settings (from user_2fa_settings table)
 * Used by: TwoFactorAuthTab, SessionPrivacyTab
 */
export async function get2FASettings(userId) {
  try {
    const result = await db.query(
      `SELECT enabled, method, persistent_session 
       FROM user_2fa_settings WHERE user_id = $1`,
      [userId]
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
 * Used by: TwoFactorAuthTab
 */
export async function update2FASettings(userId, { enabled, method }) {
  try {
    const result = await db.query(
      `UPDATE user_2fa_settings 
       SET enabled = $1, method = $2, updated_at = NOW()
       WHERE user_id = $3
       RETURNING enabled, method, persistent_session`,
      [enabled, method, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('2FA settings not found');
    }

    return result.rows[0];
  } catch (err) {
    console.error('[SECURITY] Error updating 2FA settings:', err);
    throw err;
  }
}

/**
 * Update session persistence preference
 * Used by: SessionPrivacyTab
 */
export async function updateSessionPreference(userId, persistentSession) {
  try {
    const result = await db.query(
      `UPDATE user_2fa_settings 
       SET persistent_session = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING persistent_session`,
      [persistentSession === true, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('2FA settings not found');
    }

    console.log('[SECURITY] ✓ Session preference updated for user:', userId, { persistentSession });
    return result.rows[0];
  } catch (err) {
    console.error('[SECURITY] Error updating session preference:', err);
    throw err;
  }
}
