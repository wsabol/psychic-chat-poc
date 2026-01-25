/**
 * Security Routes
 * Handles user security settings: devices, 2FA, phone/email verification
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { verifyUserOwnership } from '../middleware/verifyUserOwnership.js';
import { db } from '../shared/db.js';
import * as securityService from '../services/securityService.js';
import { validationError, serverError, successResponse } from '../utils/responses.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/security/track-device/:userId
 * Track a new device login
 */
router.post('/track-device/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { deviceName, ipAddress } = req.body;

    if (!deviceName || !ipAddress) {
      return validationError(res, 'deviceName and ipAddress required');
    }

    // Import hashUserId
    const { hashUserId } = await import('../shared/hashUtils.js');
    
    // Get the current device entry and hash the user ID
    const userAgent = req.get('user-agent') || 'Unknown';
    const token = req.get('authorization')?.split(' ')[1] || 'unknown';
    const userIdHash = hashUserId(userId);

    const result = await db.query(
      `INSERT INTO security_sessions (user_id_hash, firebase_token_encrypted, device_name_encrypted, ip_address_encrypted, user_agent_encrypted, last_active, created_at)
       VALUES ($1, pgp_sym_encrypt($2, $6), pgp_sym_encrypt($3, $6), pgp_sym_encrypt($4, $6), pgp_sym_encrypt($5, $6), NOW(), NOW())
       ON CONFLICT (user_id_hash) DO UPDATE SET
         firebase_token_encrypted = pgp_sym_encrypt($2, $6),
         device_name_encrypted = pgp_sym_encrypt($3, $6),
         ip_address_encrypted = pgp_sym_encrypt($4, $6),
         user_agent_encrypted = pgp_sym_encrypt($5, $6),
         last_active = NOW()
       RETURNING id, last_active, created_at`,
      [userIdHash, token, deviceName, ipAddress, userAgent, process.env.ENCRYPTION_KEY]
    );

    successResponse(res, { success: true, device: result.rows[0] });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to track device');
  }
});

/**
 * GET /api/security/devices/:userId
 * Get all devices user is logged in from
 */
router.get('/devices/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await securityService.getDevices(userId);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get devices');
  }
});

/**
 * DELETE /api/security/devices/:userId/:deviceId
 * Log out a specific device
 */
router.delete('/devices/:userId/:deviceId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId, deviceId } = req.params;
    const result = await securityService.logoutDevice(userId, deviceId);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to logout device');
  }
});

/**
 * GET /api/security/phone/:userId
 * Get phone data
 */
router.get('/phone/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await securityService.getPhoneData(userId);
    successResponse(res, data);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get phone data');
  }
});

/**
 * POST /api/security/phone/:userId
 * Save phone number and send verification code
 */
router.post('/phone/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { phoneNumber, recoveryPhone } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return validationError(res, 'Phone number is required');
    }

    const result = await securityService.savePhoneNumber(userId, phoneNumber, recoveryPhone);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to save phone number');
  }
});

/**
 * POST /api/security/phone/:userId/verify
 * Verify phone code
 */
router.post('/phone/:userId/verify', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return validationError(res, 'Verification code is required');
    }

    const result = await securityService.verifyPhoneCode(userId, code);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return validationError(res, err.message);
  }
});

/**
 * GET /api/security/email/:userId
 * Get email data
 */
router.get('/email/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await securityService.getEmailData(userId);
    successResponse(res, data);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get email data');
  }
});

/**
 * POST /api/security/email/:userId
 * Save recovery email and send verification code
 */
router.post('/email/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { recoveryEmail } = req.body;

    if (!recoveryEmail || typeof recoveryEmail !== 'string') {
      return validationError(res, 'Recovery email is required');
    }

    const result = await securityService.saveRecoveryEmail(userId, recoveryEmail);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to save recovery email');
  }
});

/**
 * POST /api/security/email/:userId/verify
 * Verify email code
 */
router.post('/email/:userId/verify', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return validationError(res, 'Verification code is required');
    }

    const result = await securityService.verifyEmailCode(userId, code);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return validationError(res, err.message);
  }
});

/**
 * DELETE /api/security/email/:userId
 * Remove recovery email
 */
router.delete('/email/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await securityService.removeRecoveryEmail(userId);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to remove recovery email');
  }
});

/**
 * POST /api/security/password-changed/:userId
 * Record password change and log out other sessions
 */
router.post('/password-changed/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await securityService.recordPasswordChange(userId);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to record password change');
  }
});

/**
 * GET /api/security/2fa-settings/:userId
 * Get 2FA and session settings
 */
router.get('/2fa-settings/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = await securityService.get2FASettings(userId);
    successResponse(res, { success: true, settings });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get 2FA settings');
  }
});

/**
 * POST /api/security/2fa-settings/:userId
 * Update 2FA settings (enabled, method)
 */
router.post('/2fa-settings/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled, method } = req.body;

    if (typeof enabled !== 'boolean') {
      return validationError(res, 'enabled must be boolean');
    }

    if (!method || !['sms', 'email'].includes(method)) {
      return validationError(res, 'method must be sms or email');
    }

    const settings = await securityService.update2FASettings(userId, { enabled, method });

    successResponse(res, { 
      success: true, 
      settings,
      message: enabled ? '2FA enabled' : '2FA disabled'
    });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to update 2FA settings');
  }
});

/**
 * POST /api/security/session-preference/:userId
 * Update "Stay Logged In" preference
 */
router.post('/session-preference/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { persistentSession } = req.body;

    if (typeof persistentSession !== 'boolean') {
      return validationError(res, 'persistentSession must be boolean');
    }

    const result = await securityService.updateSessionPreference(userId, persistentSession);

    successResponse(res, { 
      success: true, 
      persistentSession: result.persistent_session,
      message: persistentSession 
        ? 'You will stay logged in for 30 days' 
        : 'You will log out when closing the browser'
    });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to update session preference');
  }
});

/**
 * GET /api/security/verification-methods/:userId
 * Get combined verification methods (phone + email from both tables)
 */
router.get('/verification-methods/:userId', verifyUserOwnership(), async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user email from database
    const userResult = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );
    
    const userEmail = userResult.rows[0]?.email || '';
    const methods = await securityService.getVerificationMethods(userId, userEmail);
    successResponse(res, { success: true, methods });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get verification methods');
  }
});

export default router;
