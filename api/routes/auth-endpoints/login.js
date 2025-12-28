import { Router } from 'express';
import logger from '../../shared/logger.js';
import { db } from '../../shared/db.js';
import { logAudit } from '../../shared/auditLog.js';
import { createUserDatabaseRecords, getUserProfile } from './helpers/userCreation.js';
import { recordLoginAttempt } from './helpers/accountLockout.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { encrypt } from '../../utils/encryption.js';

const router = Router();

/**
 * POST /auth/log-login-success
 * Log user login (called from client after Firebase login)
 */
router.post('/log-login-success', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) return res.status(400).json({ error: 'userId and email required' });
    
    // Ensure user record exists (prevent FK constraint violations)
    const exists = await db.query('SELECT user_id FROM user_personal_info WHERE user_id = $1', [userId]);
    if (exists.rows.length === 0) {
      try {
        await createUserDatabaseRecords(userId, email);
      } catch (createErr) {
        logger.error('Failed to create user records:', createErr.message);
      }
    }

    // Create default preferences if they don't exist (DON'T overwrite existing)
    try {
      const userIdHash = hashUserId(userId);
      const prefExists = await db.query(
        'SELECT user_id_hash FROM user_preferences WHERE user_id_hash = $1',
        [userIdHash]
      );
      
      // Only create if doesn't exist - never overwrite saved preferences
      if (prefExists.rows.length === 0) {
        await db.query(
          `INSERT INTO user_preferences (user_id_hash, language, response_type, voice_enabled)
           VALUES ($1, $2, $3, $4)`,
          [userIdHash, 'en-US', 'full', true]
        );
      }
    } catch (prefErr) {
      logger.warn('Failed to create default preferences:', prefErr.message);
    }

    // Log successful login - audit_log schema: user_id_hash, action, details, ip_address_encrypted, user_agent, created_at
    await logAudit(db, {
      userId,
      action: 'USER_LOGIN_SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { email }
    });

    return res.json({ success: true });
  } catch (err) {
    logger.error('Login logging error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/log-login-attempt
 * Record a login attempt (success or failure)
 */
router.post('/log-login-attempt', async (req, res) => {
  try {
    const { userId, success, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const result = await recordLoginAttempt(userId, success, reason, req);
    return res.json(result);
  } catch (error) {
    logger.error('Login attempt logging error:', error.message);
    return res.status(500).json({ error: 'Failed to log login attempt' });
  }
});

/**
 * POST /auth/check-account-lockout/:userId
 * Check if account is currently locked
 */
router.post('/check-account-lockout/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const userIdHash = hashUserId(userId);
    const lockoutResult = await db.query(
      `SELECT lock_expires_at FROM user_account_lockouts 
       WHERE user_id_hash = $1 AND lock_expires_at > NOW()`,
      [userIdHash]
    );

    if (lockoutResult.rows.length > 0) {
      const lockout = lockoutResult.rows[0];
      const minutesRemaining = Math.ceil(
        (new Date(lockout.lock_expires_at) - new Date()) / 1000 / 60
      );

      // Log blocked login attempt - audit_log schema: user_id_hash, action, details, ip_address_encrypted, user_agent, created_at
      await logAudit(db, {
        userId,
        action: 'LOGIN_BLOCKED_ACCOUNT_LOCKED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'BLOCKED',
        details: { minutesRemaining }
      });

      return res.status(429).json({
        success: false,
        locked: true,
        message: `Account locked due to too many failed login attempts. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
        unlockAt: lockout.lock_expires_at,
        minutesRemaining
      });
    }

    return res.json({
      success: true,
      locked: false,
      message: 'Account is not locked'
    });
  } catch (error) {
    logger.error('Account lockout check error:', error.message);
    return res.status(500).json({ error: 'Failed to check account lockout' });
  }
});

export default router;
