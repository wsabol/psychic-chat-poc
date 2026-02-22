/**
 * 2fa/deviceTrust.js
 *
 * Handlers for all device-trust management routes:
 *
 *   GET    /auth/check-current-device-trust/:userId
 *   POST   /auth/trust-current-device/:userId
 *   POST   /auth/revoke-current-device-trust/:userId
 *   GET    /auth/trusted-devices/:userId
 *   POST   /auth/trust-admin-device
 *   DELETE /auth/trusted-device/:userId/:deviceId
 *
 * ─── Design: per-user, per-device trust via admin_trusted_ips ───────────────
 *
 * Every (user × device) pair gets its own row in admin_trusted_ips, keyed by a
 * SHA-256 hash of the User-Agent string.  This means:
 *
 *   • A family sharing a computer each has independent trust decisions.
 *   • Mobile users are correctly identified even when their IP changes.
 *   • The settings-page "This Device" badge is always accurate.
 *
 * The admin login-bypass flow (check-2fa) continues to use IP-based matching
 * (checkTrustedIP) for admin accounts — that is a separate security concern and
 * is untouched here.  Only the *settings-page* device-trust UI uses UA matching.
 */

import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { extractDeviceName } from '../../../shared/deviceFingerprint.js';
import { parseDeviceInfo } from '../../../shared/sessionManager/utils/deviceParser.js';
import { forbiddenError, serverError, successResponse } from '../../../utils/responses.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import {
  isAdmin,
  recordTrustedIP,
  logAdminLoginAttempt,
  getTrustedIPs,
  revokeTrustedIP,
  checkTrustedDevice,
  recordTrustedDevice,
  setTrustedDeviceInactiveByUA,
} from '../../../services/adminIpService.js';
import { buildAuditFields, getUserEmail } from './helpers.js';

// ---------------------------------------------------------------------------
// GET /auth/check-current-device-trust/:userId
// ---------------------------------------------------------------------------

/**
 * Returns whether the requesting device is trusted for the given user.
 *
 * Device key resolution (first match wins):
 *   1. X-Device-ID header  — set by the mobile app (a persistent UUID stored
 *      in AsyncStorage).  React Native cannot set User-Agent from JS because
 *      it is a forbidden XHR header, so we use this custom header instead.
 *   2. User-Agent header   — used by web browsers automatically.
 *
 * ALL users (admin and regular) are checked via the UA-keyed rows in
 * admin_trusted_ips.  This correctly handles mobile devices whose IP changes
 * between sessions.
 */
export async function checkCurrentDeviceTrustHandler(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    // Prefer X-Device-ID (mobile) over User-Agent (web)
    const deviceKey = req.get('x-device-id') || req.get('user-agent') || '';
    const trusted = await checkTrustedDevice(userId, deviceKey);

    return successResponse(res, { success: true, isTrusted: !!trusted });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'check-current-device-trust');
    return serverError(res, 'Failed to check device trust status');
  }
}

// ---------------------------------------------------------------------------
// POST /auth/trust-current-device/:userId
// ---------------------------------------------------------------------------

/**
 * Marks the current device as permanently trusted.
 *
 * Writes a device-key-keyed row to admin_trusted_ips for ALL users.  The
 * current IP is stored for audit purposes but is NOT used for matching.
 *
 * Device key resolution (first match wins):
 *   1. X-Device-ID header  — mobile app persistent UUID
 *   2. User-Agent header   — web browser
 *
 * Each user gets their own row even when sharing a device with other users.
 */
export async function trustCurrentDeviceHandler(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    // Prefer X-Device-ID (mobile) over User-Agent (web)
    const deviceKey  = req.get('x-device-id') || req.get('user-agent') || '';
    const ipAddress  = req.ip || '';
    const deviceName = req.body?.deviceName || extractDeviceName(req.get('user-agent') || '');

    await recordTrustedDevice(userId, deviceKey, ipAddress, deviceName);

    await logAudit(
      db,
      buildAuditFields(req, {
        userId,
        action: 'DEVICE_TRUSTED_FROM_SETTINGS',
        resourceType: 'security',
        status: 'SUCCESS',
        details: { deviceName },
      })
    );

    return successResponse(res, {
      success: true,
      message: "Device trusted. You won't need 2FA from this device for future logins.",
    });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'trust-current-device');
    return serverError(res, 'Failed to trust device');
  }
}

// ---------------------------------------------------------------------------
// POST /auth/revoke-current-device-trust/:userId
// ---------------------------------------------------------------------------

/**
 * Revokes trust on the device that is currently making the request.
 *
 * Keeps the row in admin_trusted_ips with is_trusted = FALSE so the UI can
 * show "Not trusted" in red, and the user can re-trust without a new insert.
 *
 * Device key resolution (first match wins):
 *   1. X-Device-ID header  — mobile app persistent UUID
 *   2. User-Agent header   — web browser
 */
export async function revokeCurrentDeviceTrustHandler(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    // Prefer X-Device-ID (mobile) over User-Agent (web)
    const deviceKey = req.get('x-device-id') || req.get('user-agent') || '';
    const updated = await setTrustedDeviceInactiveByUA(userId, deviceKey);

    if (!updated) {
      // Row doesn't exist yet — nothing to revoke (not an error)
      return successResponse(res, { success: true, message: 'Device was not trusted' });
    }

    await logAudit(
      db,
      buildAuditFields(req, {
        userId,
        action: 'DEVICE_TRUST_REVOKED_FROM_SETTINGS',
        resourceType: 'security',
        status: 'SUCCESS',
      })
    );

    return successResponse(res, { success: true, message: 'Device trust removed' });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'revoke-current-device-trust');
    return serverError(res, 'Failed to revoke device trust');
  }
}

// ---------------------------------------------------------------------------
// GET /auth/trusted-devices/:userId
// ---------------------------------------------------------------------------

/**
 * Returns ALL device records for the user from admin_trusted_ips (both trusted
 * and untrusted), sorted by most-recently active first.
 *
 * Rows with is_trusted = FALSE are included so the UI can show them in red
 * ("Not trusted") rather than silently removing them from the list.
 */
export async function trustedDevicesHandler(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    const rows = await getTrustedIPs(userId);
    const devices = rows.map(r => ({
      id:           r.id,
      device_name:  r.device_name || 'Unknown Device',
      created_at:   r.created_at,
      last_active:  r.last_accessed,
      trust_expiry: null, // all trust in admin_trusted_ips is permanent
      is_trusted:   r.is_trusted,
    }));

    return successResponse(res, { success: true, devices });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'trusted-devices');
    return serverError(res, 'Failed to fetch trusted devices');
  }
}

// ---------------------------------------------------------------------------
// POST /auth/trust-admin-device
// ---------------------------------------------------------------------------

/**
 * Called after a successful admin 2FA challenge from a new IP.
 * Adds the current IP to the admin's trusted-IP list so future logins
 * from that IP skip 2FA.
 *
 * NOTE: This handler continues to use IP-based trust (recordTrustedIP) because
 * the admin login-bypass check (check-2fa) compares by IP for security reasons.
 * It is separate from the settings-page UA-based trust managed above.
 */
export async function trustAdminDeviceHandler(req, res) {
  try {
    const { userId } = req.user;
    const { browserInfo } = req.body || {};

    const deviceInfo = parseDeviceInfo(req);
    const { ipAddress, deviceName } = deviceInfo;

    // Verify the caller is actually an admin
    const userResult = await db.query(
      `SELECT is_admin FROM user_personal_info WHERE user_id = $1`,
      [userId]
    );
    if (!userResult.rows[0]?.is_admin) {
      return forbiddenError(res, 'Not authorized');
    }

    await recordTrustedIP(userId, ipAddress, deviceName, browserInfo);
    await logAdminLoginAttempt(userId, ipAddress, deviceName, '2fa_passed');

    await logAudit(db, {
      userId,
      action: 'ADMIN_DEVICE_TRUSTED_AFTER_2FA',
      resourceType: 'security',
      ipAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { deviceName },
    });

    return successResponse(res, {
      success: true,
      message: "Device trusted. You won't need 2FA from this IP again.",
    });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'trust-admin-device');
    return serverError(res, 'Failed to trust device');
  }
}

// ---------------------------------------------------------------------------
// DELETE /auth/trusted-device/:userId/:deviceId
// ---------------------------------------------------------------------------

/**
 * Fully removes a specific device record by its row ID.
 * Ownership is verified by the user_id_hash inside revokeTrustedIP so users
 * cannot revoke other users' devices.
 */
export async function revokeTrustedDeviceHandler(req, res) {
  try {
    const { userId, deviceId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    const deleted = await revokeTrustedIP(userId, deviceId);
    if (!deleted) return serverError(res, 'Device not found');

    await logAudit(
      db,
      buildAuditFields(req, {
        userId,
        action: 'TRUSTED_DEVICE_REVOKED',
        resourceType: 'security',
        status: 'SUCCESS',
        details: { deviceId },
      })
    );

    return successResponse(res, { success: true, message: 'Device trust revoked' });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'revoke-trusted-device');
    return serverError(res, 'Failed to revoke device trust');
  }
}
