/**
 * Session Service
 * Core session CRUD operations and lifecycle management
 * FIXED: user_id_hash, encrypted ip_address
 */

import { db } from '../../db.js';
import { generateSessionToken, hashSessionToken } from '../utils/sessionTokenizer.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';
import { getEncryptionKey } from '../../decryptionHelper.js';
import { hashUserId } from '../../hashUtils.js';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SESSIONS_PER_USER = 5;

/**
 * Create a new session
 * @param {string} userId - User ID
 * @param {Object} req - Express request (for device info)
 * @returns {Promise<Object>} Session with plaintext token
 */
export async function createSession(userId, req) {
  try {
    // Generate and hash token
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);

    // Parse device information
    const deviceInfo = parseDeviceInfo(req);

    // Encrypt sensitive data using PostgreSQL
    const ENCRYPTION_KEY = getEncryptionKey();
    const userIdHash = hashUserId(userId);
    let encryptedUserAgent = null;
    let encryptedIpAddress = null;

    if (deviceInfo.userAgent) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [deviceInfo.userAgent, ENCRYPTION_KEY]
        );
        encryptedUserAgent = encResult.rows[0]?.encrypted;
      } catch (encErr) {
      }
    }

    if (deviceInfo.ipAddress) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [deviceInfo.ipAddress, ENCRYPTION_KEY]
        );
        encryptedIpAddress = encResult.rows[0]?.encrypted;
      } catch (encErr) {
      }
    }

    // Store session with hashed token and encrypted sensitive data
    const result = await db.query(
      `INSERT INTO user_sessions (
        user_id_hash, session_token_hash, device_name_encrypted, device_type,
        browser_name, browser_version, os_name, os_version,
        ip_address_encrypted, user_agent_encrypted, expires_at, created_at,
        last_activity_at, status, is_2fa_verified
      ) VALUES ($1, $2, pgp_sym_encrypt($3, $10), $4, $5, $6, $7, $8, $9, $11, $12, NOW(),
               NOW(), 'active', FALSE)
      RETURNING id, expires_at`,
      [
        userIdHash,
        sessionTokenHash,
        deviceInfo.deviceName,
        deviceInfo.deviceType,
        deviceInfo.browserName,
        deviceInfo.browserVersion,
        deviceInfo.osName,
        deviceInfo.osVersion,
        encryptedIpAddress,
        ENCRYPTION_KEY,
        encryptedUserAgent,
        expiresAt
      ]
    );

    // Clean up old sessions
    await cleanupOldSessions(userId);

    return {
      sessionId: result.rows[0].id,
      token: sessionToken, // Return plaintext to client
      expiresAt: expiresAt
    };

  } catch (error) {
    console.error('[SESSION] Error creating session:', error);
    throw error;
  }
}

/**
 * Validate a session token
 * @param {string} sessionToken - Plaintext token from client
 * @returns {Promise<Object|null>} Valid session or null
 */
export async function validateSession(sessionToken) {
  try {
    const sessionTokenHash = hashSessionToken(sessionToken);

    const result = await db.query(
      `SELECT id, user_id_hash, expires_at, status, last_activity_at 
       FROM user_sessions 
       WHERE session_token_hash = $1
       LIMIT 1`,
      [sessionTokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      await updateSessionStatus(session.id, 'expired');
      return null;
    }

    // Check if revoked
    if (session.status !== 'active') {
      return null;
    }

    // Update activity timestamp
    await updateLastActivity(session.id);

    return {
      sessionId: session.id,
      userIdHash: session.user_id_hash,
      expiresAt: session.expires_at,
      lastActivity: session.last_activity_at
    };

  } catch (error) {
    console.error('[SESSION] Error validating session:', error);
    return null;
  }
}

/**
 * Get all active sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Active sessions
 */
export async function getActiveSessions(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT id, device_type, browser_name, browser_version,
              os_name, created_at, last_activity_at, expires_at,
              status
       FROM user_sessions
       WHERE user_id_hash = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY last_activity_at DESC`,
      [userIdHash]
    );

    return result.rows.map(session => ({
      sessionId: session.id,
      deviceType: session.device_type,
      browser: `${session.browser_name} ${session.browser_version}`,
      os: `${session.os_name}`,
      createdAt: session.created_at,
      lastActivity: session.last_activity_at,
      expiresAt: session.expires_at
    }));

  } catch (error) {
    console.error('[SESSION] Error getting sessions:', error);
    return [];
  }
}

/**
 * Revoke a specific session
 * @param {number} sessionId - Session ID
 * @param {string} userId - User ID (for validation)
 * @returns {Promise<boolean>}
 */
export async function revokeSession(sessionId, userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `UPDATE user_sessions 
       SET status = 'revoked', logged_out_at = NOW()
       WHERE id = $1 AND user_id_hash = $2`,
      [sessionId, userIdHash]
    );

    return result.rowCount > 0;

  } catch (error) {
    console.error('[SESSION] Error revoking session:', error);
    return false;
  }
}

/**
 * Revoke all sessions for a user (logout everywhere)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of revoked sessions
 */
export async function revokeAllSessions(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `UPDATE user_sessions 
       SET status = 'revoked', logged_out_at = NOW()
       WHERE user_id_hash = $1 AND status = 'active'`,
      [userIdHash]
    );

    return result.rowCount;

  } catch (error) {
    console.error('[SESSION] Error revoking all sessions:', error);
    return 0;
  }
}

/**
 * Update session status
 * @private
 */
async function updateSessionStatus(sessionId, status) {
  try {
    await db.query(
      'UPDATE user_sessions SET status = $1 WHERE id = $2',
      [status, sessionId]
    );
  } catch (error) {
    console.error('[SESSION] Error updating session status:', error);
  }
}

/**
 * Update last activity timestamp
 * @private
 */
async function updateLastActivity(sessionId) {
  try {
    await db.query(
      'UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1',
      [sessionId]
    );
  } catch (error) {
    console.error('[SESSION] Error updating last activity:', error);
  }
}

/**
 * Clean up old sessions (keep only MAX_SESSIONS_PER_USER)
 * @private
 */
async function cleanupOldSessions(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT id FROM user_sessions
       WHERE user_id_hash = $1 AND status = 'active'
       ORDER BY last_activity_at DESC
       OFFSET $2`,
      [userIdHash, MAX_SESSIONS_PER_USER]
    );

    // Revoke old sessions
    for (const session of result.rows) {
      await updateSessionStatus(session.id, 'revoked');
    }

  } catch (error) {
    console.error('[SESSION] Error cleaning up old sessions:', error);
  }
}

export default {
  createSession,
  validateSession,
  getActiveSessions,
  revokeSession,
  revokeAllSessions
};

