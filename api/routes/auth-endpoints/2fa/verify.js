/**
 * 2fa/verify.js
 *
 * Handler for:
 *   POST /auth/verify-2fa
 *
 * Verifies a 2FA code (email or SMS) and optionally marks the current
 * device as trusted.
 */

import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { hashUserId } from '../../../shared/hashUtils.js';
import { getVerificationCode } from '../../../shared/encryptedQueries.js';
import { extractDeviceName } from '../../../shared/deviceFingerprint.js';
import { verifySMSCode } from '../../../shared/smsService-aws.js';
import { decryptPhone } from '../../../services/security/helpers/securityHelpers.js';
import { validationError, serverError, successResponse } from '../../../utils/responses.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { buildAuditFields } from './helpers.js';
import { recordTrustedDevice } from '../../../services/adminIpService.js';

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /auth/verify-2fa
 *
 * Body:
 *   userId       {string}  – Firebase UID
 *   code         {string}  – 6-digit verification code
 *   method       {string}  – 'email' | 'sms'  (defaults to email)
 *   trustDevice  {boolean} – whether to permanently trust this device
 */
export async function verify2FAHandler(req, res) {
  try {
    const { userId, code, trustDevice: shouldTrustDevice, method } = req.body;

    if (!userId || !code) {
      return validationError(res, 'userId and code are required');
    }

    // ------------------------------------------------------------------
    // 1. Validate the code
    // ------------------------------------------------------------------
    let codeIsValid = false;

    if (method === 'sms') {
      codeIsValid = await verifySMSCode_handler(res, userId, code, req);
      // verifySMSCode_handler returns false AND sends a response on failure
      if (codeIsValid === null) return;
    } else {
      codeIsValid = await verifyEmailCode_handler(res, userId, code, req);
      if (codeIsValid === null) return;
    }

    if (!codeIsValid) {
      return validationError(res, 'Invalid or expired 2FA code');
    }

    // ------------------------------------------------------------------
    // 2. Optionally trust the current device
    // ------------------------------------------------------------------
    // Records the trust row in admin_trusted_ips — the same table that
    // checkTrustedDevice(), check-current-device-trust, and the security
    // page all read from.  Using the wrong table (security_sessions via the
    // old upsertDeviceTrust helper) was the bug: trust was stored but never
    // found, so the device always appeared untrusted after registration.
    //
    // Device key priority (mirrors trustCurrentDeviceHandler):
    //   1. X-Device-ID header – mobile app's persistent UUID (React Native
    //      cannot set User-Agent from JS, so this custom header is used instead)
    //   2. User-Agent header  – web browsers send this automatically
    if (shouldTrustDevice) {
      try {
        const deviceKey  = req.get('x-device-id') || req.get('user-agent') || '';
        const ipAddress  = req.ip || '';
        const deviceName = extractDeviceName(req.get('user-agent') || '');
        await recordTrustedDevice(userId, deviceKey, ipAddress, deviceName);
      } catch (trustErr) {
        // Non-fatal: device trust failure should not block login
        logErrorFromCatch(trustErr, 'app', 'verify-2fa/trust-device');
      }
    }

    // ------------------------------------------------------------------
    // 3. Audit + respond
    // ------------------------------------------------------------------
    await logAudit(
      db,
      buildAuditFields(req, {
        userId,
        action: 'USER_2FA_VERIFIED',
        status: 'SUCCESS',
        details: { deviceTrusted: shouldTrustDevice || false },
      })
    );

    return successResponse(res, {
      success: true,
      message: '2FA verified',
      deviceTrusted: shouldTrustDevice || false,
    });
  } catch (err) {
    logErrorFromCatch(err, 'app', 'verify-2fa');
    return serverError(res, 'Failed to verify 2FA code');
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Validate an SMS code via AWS SNS / Twilio Verify.
 * Returns true on success, null if a response was already sent (failure path).
 */
async function verifySMSCode_handler(res, userId, code, req) {
  const userIdHash = hashUserId(userId);

  const phoneResult = await db.query(
    `SELECT phone_number_encrypted FROM security WHERE user_id_hash = $1`,
    [userIdHash]
  );

  if (!phoneResult.rows[0]?.phone_number_encrypted) {
    validationError(res, 'No phone number on file for SMS verification');
    return null;
  }

  const phoneNumber = decryptPhone(phoneResult.rows[0].phone_number_encrypted);
  if (!phoneNumber) {
    validationError(res, 'Unable to decrypt phone number');
    return null;
  }

  const verifyResult = await verifySMSCode(phoneNumber, code);

  if (!verifyResult.success || !verifyResult.valid) {
    await logAudit(
      db,
      buildAuditFields(req, {
        userId,
        action: 'USER_2FA_FAILED',
        status: 'FAILED',
        details: { method: 'sms', reason: 'invalid_code' },
      })
    );
    validationError(res, 'Invalid or expired 2FA code');
    return null;
  }

  return true;
}

/**
 * Validate an email-based code stored in the DB.
 * Returns true on success, null if a response was already sent (failure path).
 */
async function verifyEmailCode_handler(res, userId, code, req) {
  const codeResult = await getVerificationCode(db, userId, code);

  if (codeResult.rows.length === 0) {
    await logAudit(
      db,
      buildAuditFields(req, {
        userId,
        action: 'USER_2FA_FAILED',
        status: 'FAILED',
        details: { method: 'email', reason: 'invalid_code' },
      })
    );
    validationError(res, 'Invalid or expired 2FA code');
    return null;
  }

  // Mark the code as used
  await db.query(
    'UPDATE verification_codes SET verified_at = NOW() WHERE id = $1',
    [codeResult.rows[0].id]
  );

  return true;
}
