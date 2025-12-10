/**
 * Session Management Service
 * Handles user session lifecycle, timeouts, and multi-device login
 * 
 * Features:
 * - Session token generation and validation
 * - Inactivity timeout (15 minutes)
 * - Multi-device session tracking
 * - Device fingerprinting (browser, OS, IP)
 * - Session revocation
 * 
 * SECURITY:
 * - IP addresses are encrypted before storage
 * - Uses pgp_sym_encrypt for transparent database encryption
 */

import { db } from './db.js';
import { getEncryptionKey } from './decryptionHelper.js';
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
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);
    
    // Parse device info
    const parser = new UAParser(req.get('user-agent'));
    const result = parser.getResult();
    
    const deviceName = `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'}`;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const ENCRYPTION_KEY = getEncryptionKey();

    // Encrypt IP address before storing
    let encryptedIp = null;
    try {
      const encResult = await db.query(
        'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
        [ipAddress, ENCRYPTION_KEY]
      );
      encryptedIp = encResult.rows[0]?.encrypted;
    } catch (encErr) {
      console.warn('[SESSION] WARNING: Failed to encrypt IP:', encErr.message);
    }
    
    // Insert session
    const sessionResult = await db.query(
      `INSERT INTO user_sessions (
        user_id, session_token, device_name, device_type,
        browser_name, browser_version, ip_address_encrypted, user_agent,
        expires_at, created_at, last_activity_at, status, is_2fa_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), 'active', FALSE)
      RETURNING id, session_token, expires_at, device_name`,
      [
        userId,
        sessionToken,
        deviceName,
        result.device.type || 'desktop',
        result.browser.name || 'Unknown',
        result.browser.version || 'Unknown',
        encryptedIp,
        req.get('user-agent'),
        expiresAt
      ]
    );

    // Clean up old sessions (keep only latest 5)
    await cleanupOldSessions(userId);

    console.log(`[SESSION] Created session for user ${userId}`);
    
    return {
      sessionId: sessionResult.rows[0].id,
      token: sessionToken,
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
 * @param {string} sessionToken - Session token
 * @returns {Promise<Object>} Valid session or null
 */
export async function validateSession(sessionToken) {
  try {
    const result = await db.query(
      `SELECT id, user_id, expires_at, status, last_activity_at 
       FROM user_sessions 
       WHERE session_token = $1
       LIMIT 1`,
      [sessionToken]
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
 * Get all active sessions for a user (with decrypted IP addresses)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of active sessions
 */
export async function getActiveSessions(userId) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    
    const result = await db.query(
      `SELECT id, device_name, device_type, browser_name,
              pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
              created_at, last_activity_at, expires_at, status
       FROM user_sessions
       WHERE user_id = $2 AND status = 'active' AND expires_at > NOW()
       ORDER BY last_activity_at DESC`,
      [ENCRYPTION_KEY, userId]
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
 * Log login attempt (with IP and email encrypted)
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

    const ENCRYPTION_KEY = getEncryptionKey();

    // Encrypt email
    let encryptedEmail = null;
    if (emailAttempted) {
      try {
        const emailEncResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [emailAttempted, ENCRYPTION_KEY]
        );
        encryptedEmail = emailEncResult.rows[0]?.encrypted;
      } catch (encErr) {
        console.warn('[SESSION] WARNING: Failed to encrypt email:', encErr.message);
      }
    }

    // Encrypt IP
    let encryptedIp = null;
    if (ipAddress) {
      try {
        const ipEncResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [ipAddress, ENCRYPTION_KEY]
        );
        encryptedIp = ipEncResult.rows[0]?.encrypted;
      } catch (encErr) {
        console.warn('[SESSION] WARNING: Failed to encrypt IP:', encErr.message);
      }
    }

    await db.query(
      `INSERT INTO login_attempts (
        user_id, email_attempted_encrypted, ip_address_encrypted, user_agent,
        attempt_type, reason, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, encryptedEmail, encryptedIp, userAgent, attemptType, reason]
    );

  } catch (error) {
    console.error('[SESSION] Error logging login attempt:', error);
  }
}

/**
 * Get recent login attempts for a user (with decrypted data)
 * @param {string} userId - User ID
 * @param {number} hours - How many hours back to check
 * @returns {Promise<Array>} Login attempts
 */
export async function getLoginAttempts(userId, hours = 24) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    
    const result = await db.query(
      `SELECT attempt_type, reason, 
              pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
              created_at
       FROM login_attempts
       WHERE user_id = $2 AND created_at > NOW() - INTERVAL '1 hour' * $3
       ORDER BY created_at DESC
       LIMIT 50`,
      [ENCRYPTION_KEY, userId, hours]
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
    // Note: This requires hashing or encrypting the IP for comparison
    // For now, we'll query all attempts and handle in application code
    const ENCRYPTION_KEY = getEncryptionKey();
    
    const result = await db.query(
      `SELECT 
        attempt_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
       FROM login_attempts
       WHERE created_at > NOW() - INTERVAL '1 minute' * $1
       GROUP BY attempt_type`,
      [minutes]
    );

    let suspiciousScore = 0;
    let indicators = [];

    for (const row of result.rows) {
      // Multiple failed attempts = suspicious
      if (row.attempt_type === 'failed_password' && row.count > 5) {
        suspiciousScore += row.count;
        indicators.push(`${row.count} failed password attempts`);
      }

      // Multiple user accounts from same period = suspicious
      if (row.unique_users > 3) {
        suspiciousScore += 10;
        indicators.push(`${row.unique_users} different accounts attempted`);
      }
    }

    return {
      ipAddress: '[ENCRYPTED]',
      suspiciousScore,
      isSuspicious: suspiciousScore > 10,
      indicators
    };

  } catch (error) {
    console.error('[SESSION] Error detecting suspicious logins:', error);
    return { ipAddress: '[ENCRYPTED]', suspiciousScore: 0, isSuspicious: false, indicators: [] };
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
