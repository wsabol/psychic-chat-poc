import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import admin from 'firebase-admin';

/**
 * Get all active devices for user (from security_sessions table)
 * Decrypts encrypted device names and IP addresses
 */
export async function getDevices(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    // Query: Decrypt encrypted device_name and ip_address
    const result = await db.query(
      `SELECT 
        id,
        COALESCE(pgp_sym_decrypt(device_name_encrypted, $1), 'Unknown Device') as device_name,
        COALESCE(pgp_sym_decrypt(ip_address_encrypted, $1), '[Encrypted]') as ip_address,
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
      ipAddress: row.ip_address || '[ENCRYPTED]',  // Show IP if available, otherwise indicate encryption
      lastLogin: row.last_active,
      createdAt: row.created_at,
      isCurrent: false
    }));

    return { devices, count: devices.length };
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
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
    }

    return { success: true };
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}

/**
 * Track/upsert a device session for a user.
 * Encrypts token, deviceName, ipAddress, and userAgent with pgp_sym_encrypt.
 * Uses ON CONFLICT on user_id_hash so each user has one active session row.
 */
export async function trackDevice(userId, { token, deviceName, ipAddress, userAgent }) {
  try {
    const userIdHash = hashUserId(userId);

    const result = await db.query(
      `INSERT INTO security_sessions
         (user_id_hash, firebase_token_encrypted, device_name_encrypted,
          ip_address_encrypted, user_agent_encrypted, last_active, created_at)
       VALUES
         ($1,
          pgp_sym_encrypt($2, $6), pgp_sym_encrypt($3, $6),
          pgp_sym_encrypt($4, $6), pgp_sym_encrypt($5, $6),
          NOW(), NOW())
       ON CONFLICT (user_id_hash) DO UPDATE SET
         firebase_token_encrypted = pgp_sym_encrypt($2, $6),
         device_name_encrypted    = pgp_sym_encrypt($3, $6),
         ip_address_encrypted     = pgp_sym_encrypt($4, $6),
         user_agent_encrypted     = pgp_sym_encrypt($5, $6),
         last_active = NOW()
       RETURNING id, last_active, created_at`,
      [userIdHash, token, deviceName, ipAddress, userAgent, process.env.ENCRYPTION_KEY]
    );

    return { success: true, device: result.rows[0] };
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}

