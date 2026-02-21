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
 */

import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { hashUserId } from '../../../shared/hashUtils.js';
import { extractDeviceName } from '../../../shared/deviceFingerprint.js';
import { parseDeviceInfo } from '../../../shared/sessionManager/utils/deviceParser.js';
import { forbiddenError, serverError, successResponse } from '../../../utils/responses.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { isAdmin, recordTrustedIP, logAdminLoginAttempt, checkTrustedIP, getTrustedIPs, revokeTrustedIP, revokeTrustedIPByAddress } from '../../../services/adminIpService.js';
import { buildAuditFields, checkDeviceTrusted, upsertDeviceTrust, getUserEmail } from './helpers.js';

// ---------------------------------------------------------------------------
// GET /auth/check-current-device-trust/:userId
// ---------------------------------------------------------------------------

/**
 * Returns whether the requesting device (matched by User-Agent) is trusted
 * for the given user.
 */
export async function checkCurrentDeviceTrustHandler(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    const userEmail = await getUserEmail(userId);
    const isAdminUser = userEmail ? await isAdmin(userEmail) : false;

    if (isAdminUser) {
      // Admin path: check by IP address
      const ipAddress = req.ip || '';
      const trusted = await checkTrustedIP(userId, ipAddress);
      return successResponse(res, { success: true, isTrusted: !!trusted });
    }

    // Regular-user path: check by User-Agent
    const userIdHash = hashUserId(userId);
    const userAgent = req.get('user-agent') || '';
    const isTrusted = await checkDeviceTrusted(userIdHash, userAgent);

    return successResponse(res, { success: true, isTrusted });
  } catch (err) {
    return serverError(res, 'Failed to check device trust status');
  }
}

// ---------------------------------------------------------------------------
// POST /auth/trust-current-device/:userId
// ---------------------------------------------------------------------------

/**
 * Marks the current device as trusted permanently.
 *
 * Admins: adds the current IP to admin_trusted_ips (the table checked at login).
 * Regular users: upserts a trusted session into security_sessions.
 */
export async function trustCurrentDeviceHandler(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    const userAgent = req.get('user-agent') || '';
    const ipAddress = req.ip || '';
    const deviceName = extractDeviceName(userAgent);

    const userEmail = await getUserEmail(userId);
    const isAdminUser = userEmail ? await isAdmin(userEmail) : false;

    if (isAdminUser) {
      // Admin path: record the trusted IP
      const { browserInfo } = req.body || {};
      const deviceInfo = parseDeviceInfo(req);
      await recordTrustedIP(userId, ipAddress, deviceInfo.deviceName || deviceName, browserInfo);

      await logAudit(
        db,
        buildAuditFields(req, {
          userId,
          action: 'ADMIN_IP_TRUSTED_FROM_SETTINGS',
          resourceType: 'security',
          status: 'SUCCESS',
        })
      );

      return successResponse(res, {
        success: true,
        message: "Device trusted. You won't need 2FA from this IP for future logins.",
      });
    }

    // Regular-user path: upsert trusted device session
    const userIdHash = hashUserId(userId);
    await upsertDeviceTrust(userIdHash, deviceName, ipAddress, userAgent);

    await logAudit(
      db,
      buildAuditFields(req, {
        userId,
        action: 'DEVICE_TRUSTED_FROM_SETTINGS',
        resourceType: 'security',
        status: 'SUCCESS',
      })
    );

    return successResponse(res, { success: true, message: 'Device trusted permanently' });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'trust-current-device');
    return serverError(res, 'Failed to trust device');
  }
}

// ---------------------------------------------------------------------------
// POST /auth/revoke-current-device-trust/:userId
// ---------------------------------------------------------------------------

/**
 * Revokes trust on the device that is currently making the request
 * (matched by user_id_hash – there is one session row per user).
 */
export async function revokeCurrentDeviceTrustHandler(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    const userEmail = await getUserEmail(userId);
    const isAdminUser = userEmail ? await isAdmin(userEmail) : false;

    if (isAdminUser) {
      // Admin path: delete the trusted IP record for the current IP
      const ipAddress = req.ip || '';
      const deleted = await revokeTrustedIPByAddress(userId, ipAddress);
      if (!deleted) return serverError(res, 'Trusted IP not found');

      await logAudit(
        db,
        buildAuditFields(req, {
          userId,
          action: 'ADMIN_IP_TRUST_REVOKED_FROM_SETTINGS',
          resourceType: 'security',
          status: 'SUCCESS',
        })
      );

      return successResponse(res, { success: true, message: 'Device trust revoked' });
    }

    // Regular-user path
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `UPDATE security_sessions
       SET is_trusted = false, trust_expiry = NULL
       WHERE user_id_hash = $1
       RETURNING id`,
      [userIdHash]
    );

    if (result.rows.length === 0) {
      return serverError(res, 'Device session not found');
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

    return successResponse(res, { success: true, message: 'Device trust revoked' });
  } catch (err) {
    return serverError(res, 'Failed to revoke device trust');
  }
}

// ---------------------------------------------------------------------------
// GET /auth/trusted-devices/:userId
// ---------------------------------------------------------------------------

/**
 * Returns all currently-trusted device sessions for the user
 * (sorted by most-recently active first).
 */
export async function trustedDevicesHandler(req, res) {
  try {
    const { userId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    const userEmail = await getUserEmail(userId);
    const isAdminUser = userEmail ? await isAdmin(userEmail) : false;

    if (isAdminUser) {
      // Admin path: read from admin_trusted_ips, normalise to the same shape
      const rows = await getTrustedIPs(userId);
      const devices = rows.map(r => ({
        id: r.id,
        device_name: r.device_name || 'Unknown Device',
        created_at: r.created_at,
        last_active: r.last_accessed,
        trust_expiry: null, // admin trusted IPs are permanent
      }));
      return successResponse(res, { success: true, devices });
    }

    // Regular-user path: read from security_sessions
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT
         id,
         pgp_sym_decrypt(device_name_encrypted, $1) AS device_name,
         created_at,
         last_active,
         trust_expiry
       FROM security_sessions
       WHERE user_id_hash = $2
         AND is_trusted = true
       ORDER BY last_active DESC`,
      [process.env.ENCRYPTION_KEY, userIdHash]
    );

    return successResponse(res, { success: true, devices: result.rows });
  } catch (err) {
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
    return serverError(res, 'Failed to trust device');
  }
}

// ---------------------------------------------------------------------------
// DELETE /auth/trusted-device/:userId/:deviceId
// ---------------------------------------------------------------------------

/**
 * Revokes trust on a specific device session by its row ID.
 * Ownership is verified by matching user_id_hash so users cannot
 * revoke other users' devices.
 */
export async function revokeTrustedDeviceHandler(req, res) {
  try {
    const { userId, deviceId } = req.params;
    if (req.user.uid !== userId) return forbiddenError(res, 'Unauthorized');

    const userEmail = await getUserEmail(userId);
    const isAdminUser = userEmail ? await isAdmin(userEmail) : false;

    if (isAdminUser) {
      // Admin path: delete from admin_trusted_ips by row ID
      const deleted = await revokeTrustedIP(userId, deviceId);
      if (!deleted) return serverError(res, 'Device not found');

      await logAudit(
        db,
        buildAuditFields(req, {
          userId,
          action: 'ADMIN_TRUSTED_IP_REVOKED',
          resourceType: 'security',
          status: 'SUCCESS',
          details: { deviceId },
        })
      );

      return successResponse(res, { success: true, message: 'Device trust revoked' });
    }

    // Regular-user path: update security_sessions
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `UPDATE security_sessions
       SET is_trusted = false, trust_expiry = NULL
       WHERE id = $1
         AND user_id_hash = $2
       RETURNING id`,
      [deviceId, userIdHash]
    );

    if (result.rows.length === 0) {
      return serverError(res, 'Device not found');
    }

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
    return serverError(res, 'Failed to revoke device trust');
  }
}
