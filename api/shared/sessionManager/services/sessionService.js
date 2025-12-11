/**
 * Session Service
 * Core session CRUD operations and lifecycle management
 */

import { db } from '../../db.js';
import { generateSessionToken, hashSessionToken } from '../utils/sessionTokenizer.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';

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

    // Store session with hashed token
    const result = await db.query(
      `INSERT INTO user_sessions (
        user_id, session_token_hash, device_name, device_type,
        browser_name, browser_version, os_name, os_version,
        ip_address, user_agent, expires_at, created_at,
        last_activity_at, status, is_2fa_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(),
               NOW(), 'active', FALSE)
      RETURNING id, expires_at, device_name`,
      [
        userId,
        sessionTokenHash,
        deviceInfo.deviceName,
        deviceInfo.deviceType,
        deviceInfo.browserName,
        deviceInfo.browserVersion,
        deviceInfo.osName,
        deviceInfo.osVersion,
        deviceInfo.ipAddress,
        deviceInfo.userAgent,
        expiresAt
      ]
    );

    // Clean up old sessions
    await cleanupOldSessions(userId);

    console.log(`[SESSION] Created session for user ${userId}`);

    return {
      sessionId: result.rows[0].id,
      token: sessionToken, // Return plaintext to client
      expiresAt: expiresAt,
      deviceName: result.rows[0].device_name
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
      `SELECT id, user_id, expires_at, status, last_activity_at 
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
      userId: session.user_id,
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
    const result = await db.query(
      `SELECT id, device_name, device_type, browser_name, browser_version,
              os_name, ip_address, created_at, last_activity_at, expires_at,
              status
       FROM user_sessions
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY last_activity_at DESC`,
      [userId]
    );

    return result.rows.map(session => ({
      sessionId: session.id,
      deviceName: session.device_name,
      deviceType: session.device_type,
      browser: `${session.browser_name} ${session.browser_version}`,
      os: `${session.os_name}`,
      ipAddress: session.ip_address,
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
    const result = await db.query(
      `UPDATE user_sessions 
       SET status = 'revoked', logged_out_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (result.rowCount > 0) {
      console.log(`[SESSION] Revoked session ${sessionId} for user ${userId}`);
    }
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
    const result = await db.query(
      `UPDATE user_sessions 
       SET status = 'revoked', logged_out_at = NOW()
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    console.log(`[SESSION] Revoked ${result.rowCount} sessions for user ${userId}`);
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
    const result = await db.query(
      `SELECT id FROM user_sessions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY last_activity_at DESC
       OFFSET $2`,
      [userId, MAX_SESSIONS_PER_USER]
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
