/**
 * 2fa/check.js
 *
 * Handler for:
 *   POST /auth/check-2fa/:userId
 *
 * Decides whether 2FA is required for this login attempt and, if so,
 * dispatches a code via the user's preferred method (email or SMS).
 *
 * Flow:
 *   1. Reject locked accounts immediately.
 *   2. Admins  → check trusted-IP list; send alert+code email on new IP.
 *   3. Regular → check 2FA settings; skip if device is trusted; send code.
 */

import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { hashUserId } from '../../../shared/hashUtils.js';
import { insertVerificationCode } from '../../../shared/encryptedQueries.js';
import { parseDeviceInfo } from '../../../shared/sessionManager/utils/deviceParser.js';
import { isAccountLocked } from '../helpers/accountLockout.js';
import { generate6DigitCode } from '../../../shared/authUtils.js';
import { send2FACodeEmail } from '../../../shared/emailService.js';
import { sendSMS } from '../../../shared/smsService-aws.js';
import { resolveLocaleFromRequest } from '../../../shared/email/i18n/index.js';
import { decryptPhone } from '../../../services/security/helpers/securityHelpers.js';
import sgMail from '@sendgrid/mail';
import { validationError, serverError, successResponse, ErrorCodes } from '../../../utils/responses.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import {
  isAdmin,
  checkTrustedIP,
  checkTrustedDevice,
  recordTrustedIP,
  logAdminLoginAttempt,
} from '../../../services/adminIpService.js';
import { buildAdminNewIPEmailHTML } from '../../../services/adminEmailBuilder.js';
import { auth } from '../../../shared/firebase-admin.js';
import {
  buildAuditFields,
  generateTempToken,
  getUserEmail,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /auth/check-2fa/:userId
 *
 * Params:  userId
 * Body:    browserInfo  (optional, forwarded into temp JWT for admin flows)
 *
 * Returns one of:
 *   { requires2FA: false }                        – proceed straight to login
 *   { requires2FA: true, tempToken, method }      – show 2FA screen
 */
export async function check2FAHandler(req, res) {
  try {
    const { userId } = req.params;
    const { browserInfo } = req.body;

    if (!userId) return validationError(res, 'userId is required');

    // Server-side device / IP detection (far more reliable than client-side)
    const deviceInfo = parseDeviceInfo(req);
    const { ipAddress, deviceName } = deviceInfo;
    const userAgent = req.get('user-agent') || '';

    // ------------------------------------------------------------------
    // 1. Account lockout check
    // ------------------------------------------------------------------
    const lockStatus = await isAccountLocked(userId);
    if (lockStatus.locked) {
      await logAudit(
        db,
        buildAuditFields(req, {
          userId,
          action: 'LOGIN_BLOCKED_ACCOUNT_LOCKED',
          status: 'BLOCKED',
          details: { minutesRemaining: lockStatus.minutesRemaining },
        })
      );
      // Return structured lock details alongside the 429
      return res.status(429).json({
        success: false,
        locked: true,
        message: `Account locked. Try again in ${lockStatus.minutesRemaining} minute${lockStatus.minutesRemaining !== 1 ? 's' : ''}.`,
        errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
        unlockAt: lockStatus.unlockAt,
        minutesRemaining: lockStatus.minutesRemaining,
      });
    }

    // ------------------------------------------------------------------
    // 2. Resolve user email (with registration race-condition guard)
    // ------------------------------------------------------------------
    // getUserEmail() queries user_personal_info, which is inserted by the
    // client's /auth/register-firebase-user call.  onAuthStateChanged fires
    // synchronously after createUserWithEmailAndPassword — before that insert
    // has committed — so check-2fa can arrive before the DB row exists.
    //
    // On Firefox (production) the mark-email-verified CORS preflight sometimes
    // returns a non-ok response, causing the client to skip reload() and
    // getIdToken(true).  This removes ~300 ms of extra round-trip delay, making
    // the race far more likely to materialise.  When getUserEmail() returns null
    // we fall back to the Firebase Admin SDK, which always has the email.
    let userEmail = await getUserEmail(userId);
    if (!userEmail) {
      try {
        const fbUser = await auth.getUser(userId);
        userEmail = fbUser.email || null;
        if (userEmail) {
          console.info(
            `[check-2fa] DB email lookup missed for ${userId.slice(0, 8)}… ` +
            `(registration race) — fell back to Firebase Admin.`
          );
        }
      } catch (fbErr) {
        // Very unusual — user not found in Firebase either.  Continue and let
        // sendTwoFACode surface the email-send failure gracefully.
        logErrorFromCatch(fbErr, 'check-2fa', 'Firebase Admin email fallback');
      }
    }

    // ------------------------------------------------------------------
    // 3. Admin IP check
    // ------------------------------------------------------------------
    const isAdminUser = userEmail ? await isAdmin(userEmail) : false;

    if (isAdminUser && ipAddress) {
      return await handleAdminIPCheck(res, req, {
        userId,
        userEmail,
        ipAddress,
        deviceName,
        browserInfo,
      });
    }

    // ------------------------------------------------------------------
    // 4. Regular-user 2FA settings check
    // ------------------------------------------------------------------
    const userIdHash = hashUserId(userId);
    const twoFAResult = await db.query(
      'SELECT * FROM user_2fa_settings WHERE user_id_hash = $1',
      [userIdHash]
    );
    let twoFASettings = twoFAResult.rows[0];

    if (!twoFASettings) {
      // No settings row found at all.  This is a timing race that is
      // most visible in Chrome: onAuthStateChanged fires immediately after
      // Firebase creates the account, before the client's
      // /auth/register-firebase-user call has had time to insert the
      // default user_2fa_settings row via createUserDatabaseRecords().
      //
      // All new users default to 2FA enabled (email). Insert that default
      // row now so this request can fall through to send the verification
      // code.  ON CONFLICT is a safety net in case a parallel request
      // already created the row between our SELECT and this INSERT.
      await db.query(
        `INSERT INTO user_2fa_settings (user_id_hash, enabled, method, created_at, updated_at)
         VALUES ($1, true, 'email', NOW(), NOW())
         ON CONFLICT (user_id_hash) DO NOTHING`,
        [userIdHash]
      );
      twoFASettings = { enabled: true, method: 'email' };
      // Fall through to the trusted-device check and code-sending logic.
    } else if (!twoFASettings.enabled) {
      return successResponse(res, {
        success: true,
        userId,
        requires2FA: false,
        message: 'No 2FA required',
      });
    }

    // ------------------------------------------------------------------
    // 5. Trusted-device bypass
    // Mobile apps send X-Device-ID (a persistent UUID) because User-Agent
    // is a forbidden XHR header in React Native and cannot be set from JS.
    // Web browsers use User-Agent automatically.
    // ------------------------------------------------------------------
    const deviceKey = req.get('x-device-id') || userAgent;
    const deviceTrustedRow = await checkTrustedDevice(userId, deviceKey);
    if (deviceTrustedRow) {
      await logAudit(
        db,
        buildAuditFields(req, {
          userId,
          action: 'LOGIN_2FA_SKIPPED_TRUSTED_DEVICE',
          status: 'SUCCESS',
        })
      );
      return successResponse(res, {
        success: true,
        userId,
        requires2FA: false,
        message: 'Device is trusted - no 2FA required',
        trustedDevice: true,
      });
    }

    // ------------------------------------------------------------------
    // 6. Send 2FA code
    // ------------------------------------------------------------------
    return await sendTwoFACode(res, req, {
      userId,
      userEmail,
      userIdHash,
      method: twoFASettings.method || 'email',
    });
  } catch (error) {
    return serverError(res, `Failed to process 2FA request: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Admin IP flow (new-IP alert + code, or trusted-IP bypass)
// ---------------------------------------------------------------------------

async function handleAdminIPCheck(
  res,
  req,
  { userId, userEmail, ipAddress, deviceName, browserInfo }
) {
  // ── Diagnostic logging ────────────────────────────────────────────────────
  // Log the IP and header chain so we can diagnose proxy/trust-proxy issues
  // on AWS (CloudFront → ALB → ECS) vs local.
  const xForwardedFor = req.headers['x-forwarded-for'] || '(none)';
  const rawSocketIP   = req.socket?.remoteAddress || '(unknown)';
  console.info(
    `[2FA-ADMIN] check-2fa for ${userId.slice(0, 8)}… | ` +
    `req.ip=${ipAddress} | X-Forwarded-For: ${xForwardedFor} | socket: ${rawSocketIP} | ` +
    `device: ${deviceName}`
  );

  const trustedIP = await checkTrustedIP(userId, ipAddress);

  if (trustedIP) {
    console.info(`[2FA-ADMIN] ✓ Trusted IP matched (row ${trustedIP.id}) — skipping 2FA`);
  } else {
    console.info(
      `[2FA-ADMIN] ✗ IP not in trusted list — 2FA required. ` +
      `If this IP should be trusted, check that trust-admin-device was called ` +
      `after the previous 2FA verification with trustDevice=true.`
    );
  }

  // Known IP → skip 2FA entirely
  if (trustedIP) {
    await recordTrustedIP(userId, ipAddress, deviceName, browserInfo);
    await logAdminLoginAttempt(userId, ipAddress, deviceName, 'success');
    return successResponse(res, {
      success: true,
      userId,
      requires2FA: false,
      message: 'Admin login from trusted IP - no 2FA required',
      isAdminTrustedIP: true,
    });
  }

  // New IP → ensure we don't send duplicate alert emails within 60 s
  const userIdHash = hashUserId(userId);
  const recentAttempt = await db.query(
    `SELECT id FROM admin_login_attempts
     WHERE user_id_hash = $1
       AND attempted_at > NOW() - INTERVAL '60 seconds'`,
    [userIdHash]
  );

  const tempToken = generateTempToken({
    userId,
    isTempFor2FA: true,
    isAdminNewIP: true,
    ipAddress,
    deviceName,
    browserInfo,
  });

  if (recentAttempt.rows.length > 0) {
    // Already alerted recently – return token without a duplicate email
    return successResponse(res, {
      success: true,
      userId,
      tempToken,
      requires2FA: true,
      method: 'email',
      message: '2FA code sent to your email - New login location detected',
      isAdminNewIP: true,
    });
  }

  // First alert for this IP – save code and send combined alert + code email
  await logAdminLoginAttempt(userId, ipAddress, deviceName, 'new_ip_detected');

  const code = generate6DigitCode();
  try {
    await insertVerificationCode(db, userId, userEmail, null, code, 'email');
  } catch {
    return serverError(res, 'Failed to save 2FA code');
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const emailHTML = await buildAdminNewIPEmailHTML(code, ipAddress, deviceName);
    await sgMail.send({
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com',
      subject: '🔐 New Login Location - 2FA Required',
      html: emailHTML,
    });
    await logAdminLoginAttempt(userId, ipAddress, deviceName, 'alert_sent', true);
  } catch {
    return serverError(res, 'Failed to send 2FA code');
  }

  await logAudit(
    db,
    buildAuditFields(req, {
      userId,
      action: 'LOGIN_2FA_REQUESTED_ADMIN_NEW_IP',
      ipAddress,
      status: 'SUCCESS',
      details: { method: 'email', email: userEmail, reason: 'new_ip_for_admin' },
    })
  );

  return successResponse(res, {
    success: true,
    userId,
    tempToken,
    requires2FA: true,
    method: 'email',
    message: '2FA code sent to your email - New login location detected',
    isAdminNewIP: true,
  });
}

// ---------------------------------------------------------------------------
// Regular-user: send code via SMS or email
// ---------------------------------------------------------------------------

async function sendTwoFACode(res, req, { userId, userEmail, userIdHash, method }) {
  let sendResult;
  let recipientContact;

  if (method === 'sms') {
    // ---- SMS path ----
    const phoneResult = await db.query(
      `SELECT phone_number_encrypted FROM security WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (!phoneResult.rows[0]?.phone_number_encrypted) {
      return res.status(400).json({
        success: false,
        error:
          '2FA is set to SMS but no phone number is configured. ' +
          'Please add a phone number in Security Settings or switch to Email verification.',
        errorCode: 'NO_PHONE_NUMBER',
        suggestion:
          'Go to Security Settings > Phone Number to add your phone, ' +
          'or change 2FA method to Email',
      });
    }

    let phoneNumber;
    try {
      phoneNumber = decryptPhone(phoneResult.rows[0].phone_number_encrypted);
      if (!phoneNumber) throw new Error('Decryption returned null');
    } catch {
      return res.status(400).json({
        success: false,
        error:
          '2FA is set to SMS but your phone number could not be retrieved. ' +
          'Please re-add your phone number in Security Settings or switch to Email verification.',
        errorCode: 'PHONE_DECRYPT_ERROR',
        suggestion:
          'Go to Security Settings > Phone Number to re-add your phone, ' +
          'or change 2FA method to Email',
      });
    }

    recipientContact = phoneNumber;
    sendResult = await sendSMS(phoneNumber);

    if (!sendResult?.success) {
      if (sendResult?.code === 'RATE_LIMITED' || sendResult?.rateLimited) {
        return res.status(429).json({
          success: false,
          error:
            sendResult?.error ||
            'Too many SMS requests. Please try again in a few minutes.',
          errorCode: 'SMS_RATE_LIMITED',
          waitSeconds: sendResult?.waitSeconds,
          suggestion:
            'Please wait before requesting another verification code, ' +
            'or switch to Email verification in your Security Settings.',
        });
      }
      if (sendResult?.mockMode) {
        return res.status(503).json({
          success: false,
          error:
            'SMS verification service is not configured. ' +
            'Please contact support or use email verification.',
          errorCode: 'SMS_SERVICE_UNAVAILABLE',
        });
      }
      return serverError(
        res,
        `Failed to send 2FA code via SMS: ${sendResult?.error || 'Unknown error'}`
      );
    }
  } else {
    // ---- Email path ----

    // ------------------------------------------------------------------
    // Deduplication: prevent multiple emails when the client calls
    // check-2fa concurrently (e.g. several useAuth() hook instances each
    // firing onAuthStateChanged at the same time).
    //
    // If an unexpired, unverified code was already created within the last
    // 60 seconds, skip generating a new one and return success so the
    // existing code remains valid.  This mirrors the admin IP-alert
    // deduplication that already exists above.
    // ------------------------------------------------------------------
    const recentCodeResult = await db.query(
      `SELECT id FROM verification_codes
       WHERE user_id_hash = $1
         AND code_type = 'email'
         AND created_at > NOW() - INTERVAL '60 seconds'
         AND expires_at > NOW()
         AND verified_at IS NULL
       LIMIT 1`,
      [userIdHash]
    );

    if (recentCodeResult.rows.length > 0) {
      // A code was sent very recently — return success without flooding the inbox.
      const tempToken = generateTempToken({ userId, isTempFor2FA: true });
      return successResponse(res, {
        success: true,
        userId,
        tempToken,
        requires2FA: true,
        method: 'email',
        message: '2FA code sent to your email',
      });
    }

    const code = generate6DigitCode();
    recipientContact = userEmail;

    try {
      await insertVerificationCode(db, userId, userEmail, null, code, 'email');
    } catch {
      return serverError(res, 'Failed to save 2FA code');
    }

    sendResult = await send2FACodeEmail(userEmail, code, resolveLocaleFromRequest(req));
    if (!sendResult?.success) {
      return serverError(res, 'Failed to send 2FA code via email');
    }
  }

  const tempToken = generateTempToken({ userId, isTempFor2FA: true });

  await logAudit(
    db,
    buildAuditFields(req, {
      userId,
      action: 'LOGIN_2FA_REQUESTED',
      status: 'SUCCESS',
      details: { method, contact: recipientContact },
    })
  );

  return successResponse(res, {
    success: true,
    userId,
    tempToken,
    requires2FA: true,
    method,
    message: method === 'sms' ? '2FA code sent via SMS' : '2FA code sent to your email',
  });
}
