import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import admin from 'firebase-admin';

/**
 * Get all active devices for user (from security_sessions table)
 * Decrypts encrypted device names
 */
export async function getDevices(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await db.query(
      `SELECT 
        id, 
        pgp_sym_decrypt(device_name_encrypted, $1) as device_name,
        last_active, 
        created_at 
       FROM security_sessions 
       WHERE user_id_hash = $2 
       ORDER BY last_active DESC`,
      [process.env.ENCRYPTION_KEY, userIdHash]
    );

    const devices = result.rows.map(row => ({
      id: row.id,
      deviceName: row.device_name || 'Unknown Device',
      ipAddress: '[ENCRYPTED]',  // Don't expose encrypted IP data
      lastLogin: row.last_active,
      createdAt: row.created_at,
      isCurrent: false
    }));

    return { devices, count: devices.length };
  } catch (err) {
    console.error('[SECURITY] Error getting devices:', err);
    throw err;
  }
}

/**
 * Log out a specific device
 */
export async function logoutDevice(userId, deviceId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      'SELECT id FROM security_sessions WHERE id = $1 AND user_id_hash = $2',
      [deviceId, userIdHash]
    );

    if (result.rows.length === 0) {
      throw new Error('Device not found');
    }

    await db.query(
      'DELETE FROM security_sessions WHERE id = $1 AND user_id_hash = $2',
      [deviceId, userIdHash]
    );

    try {
      await admin.auth().revokeRefreshTokens(userId);
    } catch (err) {
      console.warn('[SECURITY] Could not revoke Firebase tokens:', err.message);
    }

    return { success: true };
  } catch (err) {
    console.error('[SECURITY] Error logging out device:', err);
    throw err;
  }
}
