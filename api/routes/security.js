/**
 * Security Routes
 * Handles user security settings: devices, 2FA, phone/email verification.
 *
 * All DB access and business logic lives in ../services/securityService.js.
 * Route handlers are extracted as named functions so each section reads as a
 * concise table of endpoints, and individual handlers are easy to locate and edit.
 *
 * Sections:
 *   1. Device Management
 *   2. Phone Verification
 *   3. Email (Recovery) Verification
 *   4. Two-Factor Authentication (2FA)
 *   5. Session Preferences
 *   6. Verification Methods
 *   7. Password Operations
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { verifyUserOwnership } from '../middleware/verifyUserOwnership.js';
import * as securityService from '../services/securityService.js';
import { validationError, serverError, successResponse } from '../utils/responses.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const router = express.Router();

// Apply authentication to all security routes
router.use(authenticateToken);


// ─── 1. Device Management ──────────────────────────────────────────────────

/**
 * Track/upsert the current device session for a user.
 * Pulls the bearer token and user-agent from request headers before
 * delegating all DB work to securityService.trackDevice().
 */
async function handleTrackDevice(req, res) {
  try {
    const { userId } = req.params;
    const { deviceName, ipAddress } = req.body;

    if (!deviceName || !ipAddress) {
      return validationError(res, 'deviceName and ipAddress required');
    }

    const token     = req.get('authorization')?.split(' ')[1] ?? 'unknown';
    const userAgent = req.get('user-agent') ?? 'Unknown';

    const result = await securityService.trackDevice(userId, { token, deviceName, ipAddress, userAgent });
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to track device');
  }
}

async function handleGetDevices(req, res) {
  try {
    const result = await securityService.getDevices(req.params.userId);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get devices');
  }
}

async function handleLogoutDevice(req, res) {
  try {
    const { userId, deviceId } = req.params;
    const result = await securityService.logoutDevice(userId, deviceId);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to logout device');
  }
}

router.post('/track-device/:userId',        verifyUserOwnership(), handleTrackDevice);
router.get('/devices/:userId',              verifyUserOwnership(), handleGetDevices);
router.delete('/devices/:userId/:deviceId', verifyUserOwnership(), handleLogoutDevice);


// ─── 2. Phone Verification ─────────────────────────────────────────────────

async function handleGetPhone(req, res) {
  try {
    const data = await securityService.getPhoneData(req.params.userId);
    successResponse(res, data);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get phone data');
  }
}

async function handleSavePhone(req, res) {
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
}

/**
 * verifyPhoneCode throws descriptive user-facing errors on failure
 * (wrong code, expired, too many attempts, etc.), so we return 400 here
 * rather than 500 — these are anticipated validation outcomes, not crashes.
 */
async function handleVerifyPhone(req, res) {
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
}

router.get('/phone/:userId',         verifyUserOwnership(), handleGetPhone);
router.post('/phone/:userId',        verifyUserOwnership(), handleSavePhone);
router.post('/phone/:userId/verify', verifyUserOwnership(), handleVerifyPhone);


// ─── 3. Email (Recovery) Verification ─────────────────────────────────────

async function handleGetEmail(req, res) {
  try {
    const data = await securityService.getEmailData(req.params.userId);
    successResponse(res, data);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get email data');
  }
}

async function handleSaveEmail(req, res) {
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
}

/**
 * Same rationale as handleVerifyPhone: the service throws user-facing errors
 * (wrong code, expired, etc.) that map naturally to 400, not 500.
 */
async function handleVerifyEmail(req, res) {
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
}

async function handleRemoveEmail(req, res) {
  try {
    const result = await securityService.removeRecoveryEmail(req.params.userId);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to remove recovery email');
  }
}

router.get('/email/:userId',         verifyUserOwnership(), handleGetEmail);
router.post('/email/:userId',        verifyUserOwnership(), handleSaveEmail);
router.post('/email/:userId/verify', verifyUserOwnership(), handleVerifyEmail);
router.delete('/email/:userId',      verifyUserOwnership(), handleRemoveEmail);


// ─── 4. Two-Factor Authentication ─────────────────────────────────────────

async function handleGet2FASettings(req, res) {
  try {
    const settings = await securityService.get2FASettings(req.params.userId);
    successResponse(res, { success: true, settings });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get 2FA settings');
  }
}

/**
 * configure2FA() owns the full orchestration:
 *   - validates phone availability for SMS mode
 *   - persists enabled/method settings
 *   - optionally saves a new phone number
 *   - returns freshly-fetched settings
 *
 * It signals user-facing validation failures via err.isValidation = true
 * so they get a 400 instead of a 500.
 */
async function handleUpdate2FASettings(req, res) {
  try {
    const { userId } = req.params;
    const { enabled, method, phoneNumber, backupPhoneNumber } = req.body;

    if (typeof enabled !== 'boolean') {
      return validationError(res, 'enabled must be boolean');
    }

    if (!method || !['sms', 'email'].includes(method)) {
      return validationError(res, 'method must be sms or email');
    }

    const settings = await securityService.configure2FA(userId, { enabled, method, phoneNumber, backupPhoneNumber });
    successResponse(res, {
      success: true,
      settings,
      message: enabled ? '2FA enabled' : '2FA disabled',
    });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    if (err.isValidation) return validationError(res, err.message);
    return serverError(res, 'Failed to update 2FA settings');
  }
}

router.get('/2fa-settings/:userId',  verifyUserOwnership(), handleGet2FASettings);
router.post('/2fa-settings/:userId', verifyUserOwnership(), handleUpdate2FASettings);


// ─── 5. Session Preferences ────────────────────────────────────────────────

/**
 * Returns { persistent_session: boolean | null }
 *   null  → user has never set a preference; client defaults to staying logged in
 *   true  → user explicitly enabled persistent sessions
 *   false → user explicitly disabled persistent sessions (sign out on app close)
 */
async function handleGetSessionPreference(req, res) {
  try {
    const persistentSession = await securityService.getSessionPreference(req.params.userId);
    successResponse(res, { success: true, persistent_session: persistentSession });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get session preference');
  }
}

async function handleUpdateSessionPreference(req, res) {
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
        ? 'You will stay logged in on this device'
        : 'You will be logged out when closing the app or browser',
    });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to update session preference');
  }
}

router.get('/session-preference/:userId',  verifyUserOwnership(), handleGetSessionPreference);
router.post('/session-preference/:userId', verifyUserOwnership(), handleUpdateSessionPreference);


// ─── 6. Verification Methods ───────────────────────────────────────────────

async function handleGetVerificationMethods(req, res) {
  try {
    const methods = await securityService.getVerificationMethods(req.params.userId);
    successResponse(res, { success: true, methods });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to get verification methods');
  }
}

router.get('/verification-methods/:userId', verifyUserOwnership(), handleGetVerificationMethods);


// ─── 7. Password Operations ────────────────────────────────────────────────

async function handlePasswordChanged(req, res) {
  try {
    const result = await securityService.recordPasswordChange(req.params.userId);
    successResponse(res, result);
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    return serverError(res, 'Failed to record password change');
  }
}

router.post('/password-changed/:userId', verifyUserOwnership(), handlePasswordChanged);


export default router;
