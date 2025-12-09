import { db } from '../../shared/db.js';
import admin from 'firebase-admin';

/**
 * Get all active devices for user (from Firebase sessions)
 */
export async function getDevices(userId) {
  try {
    const result = await db.query(
      'SELECT id, device_name, ip_address, last_active, created_at FROM security_sessions WHERE user_id = $1 ORDER BY last_active DESC',
      [userId]
    );

    const devices = result.rows.map(row => ({
      id: row.id,
      deviceName: row.device_name,
      ipAddress: row.ip_address,
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
    const result = await db.query(
      'SELECT firebase_token FROM security_sessions WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Device not found');
    }

    await db.query(
      'DELETE FROM security_sessions WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );

    try {
      await admin.auth().revokeRefreshTokens(userId);
      console.log('[SECURITY] ✓ Refresh tokens revoked for user:', userId);
    } catch (err) {
      console.warn('[SECURITY] Could not revoke Firebase tokens:', err.message);
    }

    console.log('[SECURITY] ✓ Device logged out:', deviceId);
    return { success: true };
  } catch (err) {
    console.error('[SECURITY] Error logging out device:', err);
    throw err;
  }
}
