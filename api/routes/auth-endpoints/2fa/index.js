/**
 * 2fa/index.js
 *
 * Router for all 2FA and device-trust endpoints mounted under /auth.
 *
 * Route map
 * ─────────────────────────────────────────────────────────────────────
 *  POST   /auth/verify-2fa                          verify.js
 *  POST   /auth/check-2fa/:userId                   check.js
 *
 *  GET    /auth/check-current-device-trust/:userId  deviceTrust.js
 *  POST   /auth/trust-current-device/:userId        deviceTrust.js
 *  POST   /auth/revoke-current-device-trust/:userId deviceTrust.js
 *  GET    /auth/trusted-devices/:userId             deviceTrust.js
 *  POST   /auth/trust-admin-device                  deviceTrust.js
 *  DELETE /auth/trusted-device/:userId/:deviceId    deviceTrust.js
 * ─────────────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth.js';
import { verify2FAHandler } from './verify.js';
import { check2FAHandler } from './check.js';
import {
  checkCurrentDeviceTrustHandler,
  trustCurrentDeviceHandler,
  revokeCurrentDeviceTrustHandler,
  trustedDevicesHandler,
  trustAdminDeviceHandler,
  revokeTrustedDeviceHandler,
} from './deviceTrust.js';

const router = Router();

// --- 2FA challenge flow (no auth token required – user is mid-login) ---
router.post('/verify-2fa', verify2FAHandler);
router.post('/check-2fa/:userId', check2FAHandler);

// --- Device trust management (full auth required) ---
router.get('/check-current-device-trust/:userId', authenticateToken, checkCurrentDeviceTrustHandler);
router.post('/trust-current-device/:userId',       authenticateToken, trustCurrentDeviceHandler);
router.post('/revoke-current-device-trust/:userId',authenticateToken, revokeCurrentDeviceTrustHandler);
router.get('/trusted-devices/:userId',             authenticateToken, trustedDevicesHandler);
router.post('/trust-admin-device',                 authenticateToken, trustAdminDeviceHandler);
router.delete('/trusted-device/:userId/:deviceId', authenticateToken, revokeTrustedDeviceHandler);

export default router;
