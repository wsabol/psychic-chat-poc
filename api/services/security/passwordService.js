import { db } from '../../shared/db.js';

/**
 * Record password change and log out other sessions
 */
export async function recordPasswordChange(userId) {
  try {
    await db.query(
      `INSERT INTO security (user_id, password_changed_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET password_changed_at = CURRENT_TIMESTAMP`,
      [userId]
    );

    await db.query(
      'DELETE FROM security_sessions WHERE user_id = $1',
      [userId]
    );

    console.log('[SECURITY] ✓ Password change recorded, sessions cleared');
    return { success: true };
  } catch (err) {
    console.error('[SECURITY] Error recording password change:', err);
    throw err;
  }
}
