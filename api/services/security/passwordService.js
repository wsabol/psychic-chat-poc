import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

/**
 * Record password change and log out other sessions
 */
export async function recordPasswordChange(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    await db.query(
      `INSERT INTO security (user_id, user_id_hash, password_changed_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET password_changed_at = CURRENT_TIMESTAMP`,
      [userId, userIdHash]
    );

    await db.query(
      'DELETE FROM security_sessions WHERE user_id_hash = $1',
      [userIdHash]
    );

    return { success: true };
  } catch (err) {
    logErrorFromCatch(error, 'app', 'security');
    throw err;
  }
}
