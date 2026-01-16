import { Router } from 'express';
import logger from '../../shared/logger.js';
import { db } from '../../shared/db.js';
import { logAudit } from '../../shared/auditLog.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { createUserDatabaseRecords, getUserProfile } from './helpers/userCreation.js';
import { recordLoginAttempt } from './helpers/accountLockout.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { encrypt } from '../../utils/encryption.js';
import { getCurrentTermsVersion, getCurrentPrivacyVersion } from '../../shared/versionConfig.js';
import { validationError, serverError } from '../../utils/responses.js';

const router = Router();

/**
 * POST /auth/log-login-success
 * Log user login (called from client after Firebase login)
 */
router.post('/log-login-success', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) return validationError(res, 'userId and email are required');

    // Ensure user record exists (prevent FK constraint violations)
    const exists = await db.query('SELECT user_id FROM user_personal_info WHERE user_id = $1', [userId]);
    if (exists.rows.length === 0) {
      try {
        await createUserDatabaseRecords(userId, email);
      } catch (createErr) {
        // User creation failed silently
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
        const isTemporaryUser = email && email.startsWith('temp_');
        const preferredLanguage = (isTemporaryUser && req.body?.temp_user_language) ? req.body.temp_user_language : 'en-US';

        await db.query(
          `INSERT INTO user_preferences (user_id_hash, language, response_type, voice_enabled)
           VALUES ($1, $2, $3, $4)`,
          [userIdHash, preferredLanguage, 'full', true]
        );
      }
    } catch (prefErr) {
      // Preferences creation failed silently
    }

    // For TEMPORARY accounts, automatically set user_consents to avoid blocking consent modal
    // Temp users have email starting with 'temp_' (free trial accounts)
    if (email && email.startsWith('temp_')) {
      try {
        const userIdHash = hashUserId(userId);
        const consentExists = await db.query(
          'SELECT user_id_hash FROM user_consents WHERE user_id_hash = $1',
          [userIdHash]
        );

        // Only create if doesn't exist
        if (consentExists.rows.length === 0) {
          const termsVersion = getCurrentTermsVersion();
          const privacyVersion = getCurrentPrivacyVersion();

          await db.query(
            `INSERT INTO user_consents (
              user_id_hash,
              terms_version,
              terms_accepted,
              terms_accepted_at,
              privacy_version,
              privacy_accepted,
              privacy_accepted_at,
              requires_consent_update,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, NOW(), $4, $5, NOW(), false, NOW(), NOW())`,
            [userIdHash, termsVersion, true, privacyVersion, true]
          );
        }
            } catch (consentErr) {
        // Consent creation failed silently
      }
    }
    
            // ✅ REMOVED: Don't create Stripe customer on login
    // Creating it here causes duplicate customers during concurrent requests
    // It will be created on-demand when user accesses billing page
    
    // Log successful login
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
    await logErrorFromCatch(err, 'auth', 'User login success logging');
    return serverError(res, 'Failed to log login');
  }
});

/**
 * POST /auth/log-login-attempt
 * Record a login attempt (success or failure)
 */
router.post('/log-login-attempt', async (req, res) => {
  try {
    const { userId, success, reason } = req.body;
    if (!userId) return validationError(res, 'userId is required');

    const result = await recordLoginAttempt(userId, success, reason, req);
    return res.json(result);
    } catch (error) {
    await logErrorFromCatch(error, 'auth', 'Login attempt recording');
    return serverError(res, 'Failed to log login attempt');
  }
});

/**
 * POST /auth/check-account-lockout/:userId
 * Check if account is currently locked
 */
router.post('/check-account-lockout/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return validationError(res, 'userId is required');

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

      // Log blocked login attempt
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
        minutesRemaining,
        errorCode: 'ACCOUNT_LOCKED_429'
      });
    }

    return res.json({
      success: true,
      locked: false,
      message: 'Account is not locked'
    });
    } catch (error) {
    await logErrorFromCatch(error, 'auth', 'Account lockout check');
    return serverError(res, 'Failed to check account lockout');
  }
});

export default router;
