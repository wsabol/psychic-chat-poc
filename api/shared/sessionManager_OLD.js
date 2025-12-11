/**
 * Session Management Service
 * Handles user session lifecycle, timeouts, and multi-device login
 * SECURITY: Session tokens are HASHED (SHA-256) before storage
 * SECURITY: Login attempt emails are ENCRYPTED (pgp_sym_encrypt) before storage
 * 
 * Features:
 * - Session token generation and validation (with hashing)
 * - Inactivity timeout (15 minutes)
 * - Multi-device session tracking
 * - Device fingerprinting (browser, OS, IP)
 * - Session revocation
 * - Encrypted login attempt logging
 */

import { db } from './db.js';
import crypto from 'crypto';
import UAParser from 'ua-parser-js';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;  // 15 minutes inactivity
const MAX_SESSIONS_PER_USER = 5;  // Max simultaneous sessions

/**
 * Create a new session for a user
 * @param {string} userId - User ID
 * @param {Object} req - Express request object (for IP, user-agent)
 * @returns {Promise<Object>} Session object with token
 */
export async function createSession(userId, req) {
  try {
    // Generate plaintext token (sent to client)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    // Hash token before storing in database (security best practice)
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);
    
    // Parse device info
    const parser = new UAParser(req.get('user-agent'));
    const result = parser.getResult();
    
    const deviceName = `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'}`;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Insert session with HASHED token (not plaintext)
    const sessionResult = await db.query(
      `INSERT INTO user_sessions (
        user_id, session_token_hash, device_name, device_type,
        browser_name, browser_version, ip_address, user_agent,
        expires_at, created_at, last_activity_at, status, is_2fa_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), 'active', FALSE)
      RETURNING id, expires_at, device_name`,
      [
        userId,
        sessionTokenHash,
        deviceName,
        result.device.type || 'desktop',
        result.browser.name || 'Unknown',
        result.browser.version || 'Unknown',
        ipAddress,
        req.get('user-agent'),
        expiresAt
      ]
    );

    // Clean up old sessions (keep only latest 5)
    await cleanupOldSessions(userId);

    console.log(`[SESSION] Created session for user ${userId}`);
    
    return {
      sessionId: sessionResult.rows[0].id,
      token: sessionToken,  // Return plaintext token to client
      expiresAt: expiresAt,
      deviceName: sessionResult.rows[0].device_name
    };

  } catch (error) {
    console.error('[SESSION] Error creating session:', error);
    throw error;
  }
}

/**
 * Validate and update session
 * @param {string} sessionToken - Session token (plaintext from client)
 * @returns {Promise<Object>} Valid session or null
 */
export async function validateSession(sessionToken) {
  try {
    // Hash the token before comparing with database hash
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    
    const result = await db.query(
      `SELECT id, user_id, expires_at, status, last_activity_at 
       FROM user_sessions 
       WHERE session_token_hash = $1
       LIMIT 1`,
      [sessionTokenHash]
    );

    if (result.rows.length === 0) {
      return null;  // Session not found
    }

    const session = result.rows[0];

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      await updateSessionStatus(session.id, 'expired');
      return null;
    }

    // Check if session was explicitly revoked
    if (session.status !== 'active') {
      return null;
    }

    // Update last activity time
    await db.query(
      'UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1',
      [session.id]
    );

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
 * @returns {Promise<Array>} Array of active sessions
 */
export async function getActiveSessions(userId) {
  try {
    const result = await db.query(
      `SELECT id, device_name, device_type, browser_name, ip_address,
              created_at, last_activity_at, expires_at, status
       FROM user_sessions
       WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY last_activity_at DESC`,
      [userId]
    );

    return result.rows.map(session => ({
      sessionId: session.id,
      deviceName: session.device_name,
      deviceType: session.device_type,
      browser: session.browser_name,
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
 * @returns {Promise<boolean>} Success
 */
export async function revokeSession(sessionId, userId) {
  try {
    const result = await db.query(
      `UPDATE user_sessions 
       SET status = 'revoked', logged_out_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    console.log(`[SESSION] Revoked session ${sessionId} for user ${userId}`);
    return result.rowCount > 0;

  } catch (error) {
    console.error('[SESSION] Error revoking session:', error);
    return false;
  }
}

/**
 * Revoke ALL sessions for a user (logout everywhere)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of sessions revoked
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
 * @param {number} sessionId - Session ID
 * @param {string} status - New status
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
 * Clean up old sessions (keep only MAX_SESSIONS_PER_USER)
 * @param {string} userId - User ID
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

/**
 * Log login attempt
 * SECURITY: Email is ENCRYPTED before storage
 * @param {Object} options - Login attempt details
 */
export async function logLoginAttempt(options) {
  try {
    const {
      userId = null,
      emailAttempted,
      ipAddress,
      userAgent,
      attemptType,  // 'success', 'failed_password', 'failed_2fa', 'blocked'
      reason = null
    } = options;

    // Encrypt email before storing in database
    await db.query(
      `INSERT INTO login_attempts (
        user_id, email_attempted_encrypted, ip_address, user_agent,
        attempt_type, reason, created_at
      ) VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, $7, NOW())`,
      [userId, emailAttempted, process.env.ENCRYPTION_KEY, ipAddress, userAgent, attemptType, reason]
    );

  } catch (error) {
    console.error('[SESSION] Error logging login attempt:', error);
  }
}

/**
 * Get recent login attempts for a user
 * @param {string} userId - User ID
 * @param {number} hours - How many hours back to check
 * @returns {Promise<Array>} Login attempts (email NOT decrypted, only metadata)
 */
export async function getLoginAttempts(userId, hours = 24) {
  try {
    // Note: Email is encrypted, don't include in SELECT for privacy
    const result = await db.query(
      `SELECT attempt_type, reason, ip_address, created_at
       FROM login_attempts
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour' * $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId, hours]
    );

    return result.rows;

  } catch (error) {
    console.error('[SESSION] Error getting login attempts:', error);
    return [];
  }
}

/**
 * Detect suspicious login attempts
 * @param {string} ipAddress - IP address
 * @param {number} minutes - Time window
 * @returns {Promise<Object>} Suspicious activity summary
 */
export async function detectSuspiciousLogins(ipAddress, minutes = 60) {
  try {
    // Note: Don't include email in SELECT since it's now encrypted
    const result = await db.query(
      `SELECT 
        attempt_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
       FROM login_attempts
       WHERE ip_address = $1 
         AND created_at > NOW() - INTERVAL '1 minute' * $2
       GROUP BY attempt_type`,
      [ipAddress, minutes]
    );

    let suspiciousScore = 0;
    let indicators = [];

    for (const row of result.rows) {
      // Multiple failed attempts from same IP = suspicious
      if (row.attempt_type === 'failed_password' && row.count > 5) {
        suspiciousScore += row.count;
        indicators.push(`${row.count} failed password attempts`);
      }

      // Multiple user accounts from same IP = suspicious
      if (row.unique_users > 3) {
        suspiciousScore += 10;
        indicators.push(`${row.unique_users} different accounts attempted`);
      }
    }

    return {
      ipAddress,
      suspiciousScore,
      isSuspicious: suspiciousScore > 10,
      indicators
    };

  } catch (error) {
    console.error('[SESSION] Error detecting suspicious logins:', error);
    return { ipAddress, suspiciousScore: 0, isSuspicious: false, indicators: [] };
  }
}

export default {
  createSession,
  validateSession,
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
  logLoginAttempt,
  getLoginAttempts,
  detectSuspiciousLogins
};
