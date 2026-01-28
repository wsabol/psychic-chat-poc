import { Router } from 'express';
import logger from '../../shared/logger.js';
import { db } from '../../shared/db.js';
import { authenticateToken } from '../../middleware/auth.js';
import { logAudit } from '../../shared/auditLog.js';
import { isAccountLocked } from './helpers/accountLockout.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { insertVerificationCode, getVerificationCode } from '../../shared/encryptedQueries.js';
import { extractDeviceName } from '../../shared/deviceFingerprint.js';
import { parseDeviceInfo } from '../../shared/sessionManager/utils/deviceParser.js';
import { validationError, serverError, forbiddenError, rateLimitError, successResponse, ErrorCodes } from '../../utils/responses.js';
import { isAdmin, checkTrustedIP, recordTrustedIP, logAdminLoginAttempt } from '../../services/adminIpService.js';
import { buildAdminNewIPEmailHTML } from '../../services/adminEmailBuilder.js';

const router = Router();

/**
 * POST /auth/verify-2fa
 * Verify 2FA code and optionally trust device
 * Supports both email (database) and SMS (Twilio Verify API) verification
 */
router.post('/verify-2fa', async (req, res) => {
    try {
    const { userId, code, trustDevice: shouldTrustDevice, method } = req.body;
    if (!userId || !code) return validationError(res, 'userId and code are required');
    
    logger.info(`[2FA-VERIFY] Verifying ${method} code for user ${userId}`);
    
    let codeIsValid = false;
    
    if (method === 'sms') {
      // SMS: Verify using Twilio Verify API
      const { verifySMSCode } = await import('../../shared/smsService.js');
      const { decryptPhone } = await import('../../services/security/helpers/securityHelpers.js');
      const userIdHash = hashUserId(userId);
      
      // Get phone number using proper decryption helper
      const phoneResult = await db.query(
        `SELECT phone_number_encrypted 
         FROM security 
         WHERE user_id_hash = $1`,
        [userIdHash]
      );

      if (phoneResult.rows.length === 0 || !phoneResult.rows[0].phone_number_encrypted) {
        logger.error(`[2FA-VERIFY] No phone number found for user ${userId}`);
        return validationError(res, 'No phone number on file for SMS verification');
      }

      const phoneNumber = decryptPhone(phoneResult.rows[0].phone_number_encrypted);
      
      if (!phoneNumber) {
        logger.error(`[2FA-VERIFY] Unable to decrypt phone number for user ${userId}`);
        return validationError(res, 'Unable to decrypt phone number');
      }
      
      // CRITICAL: Use Twilio Verify API verificationChecks endpoint
      // This follows Twilio's official procedure for SMS verification
      logger.info(`[2FA-VERIFY] Calling Twilio verificationChecks for phone ${phoneNumber}`);
      const verifyResult = await verifySMSCode(phoneNumber, code);
      
      logger.info(`[2FA-VERIFY] Twilio response:`, { 
        success: verifyResult.success, 
        valid: verifyResult.valid,
        status: verifyResult.status 
      });
      
      if (!verifyResult.success || !verifyResult.valid) {
        await logAudit(db, {
          userId,
          action: 'USER_2FA_FAILED',
          resourceType: 'authentication',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          httpMethod: req.method,
          endpoint: req.path,
          status: 'FAILED',
          details: { method: 'sms', reason: 'invalid_code' }
        });
        return validationError(res, 'Invalid or expired 2FA code');
      }
      
      codeIsValid = true;
      logger.info(`[2FA-VERIFY] ✅ SMS code verified successfully for user ${userId}`);
    } else {
      // Email: Verify from database
      const codeResult = await getVerificationCode(db, userId, code);
      if (codeResult.rows.length === 0) {
        await logAudit(db, {
          userId,
          action: 'USER_2FA_FAILED',
          resourceType: 'authentication',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          httpMethod: req.method,
          endpoint: req.path,
          status: 'FAILED',
          details: { method: 'email', reason: 'invalid_code' }
        });
        return validationError(res, 'Invalid or expired 2FA code');
      }
      
      // Mark code as used
      await db.query('UPDATE verification_codes SET verified_at = NOW() WHERE id = $1', [codeResult.rows[0].id]);
      codeIsValid = true;
      logger.info(`[2FA-VERIFY] ✅ Email code verified successfully for user ${userId}`);
    }
    
    if (!codeIsValid) {
      return validationError(res, 'Invalid or expired 2FA code');
    }
    
    // If user wants to trust this device, mark it as trusted
    if (shouldTrustDevice) {
      try {
        const userIdHash = hashUserId(userId);
        const userAgent = req.get('user-agent') || '';
        const ipAddress = req.ip || '';
        const deviceName = extractDeviceName(userAgent);
        const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
        
        // Update existing security_sessions row (UPSERT pattern)
        const updateResult = await db.query(
          `UPDATE security_sessions 
           SET device_name_encrypted = pgp_sym_encrypt($2, $3),
               ip_address_encrypted = pgp_sym_encrypt($4, $3),
               user_agent_encrypted = pgp_sym_encrypt($5, $3),
               is_trusted = true,
               trust_expiry = NOW() + INTERVAL '30 days',
               last_active = NOW()
           WHERE user_id_hash = $1
           RETURNING id`,
          [userIdHash, deviceName, ENCRYPTION_KEY, ipAddress, userAgent]
        );
        
        // If no row was updated, insert new one
        if (updateResult.rows.length === 0) {
          await db.query(
            `INSERT INTO security_sessions (user_id_hash, device_name_encrypted, ip_address_encrypted, user_agent_encrypted, is_trusted, trust_expiry, last_active, created_at)
             VALUES ($1, pgp_sym_encrypt($2, $3), pgp_sym_encrypt($4, $3), pgp_sym_encrypt($5, $3), true, NOW() + INTERVAL '30 days', NOW(), NOW())`,
            [userIdHash, deviceName, ENCRYPTION_KEY, ipAddress, userAgent]
          );
        }
        
      } catch (trustErr) {
      }
    }
    
    // Log success
    await logAudit(db, {
      userId,
      action: 'USER_2FA_VERIFIED',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { deviceTrusted: shouldTrustDevice || false }
    });
    
    return successResponse(res, { success: true, message: '2FA verified', deviceTrusted: shouldTrustDevice || false });
  } catch (err) {
    return serverError(res, 'Failed to verify 2FA code');
  }
});

/**
 * POST /auth/check-2fa/:userId
 * Check if 2FA is enabled
 * If device is trusted, skip 2FA
 * For ADMINS: Check if IP is trusted, require 2FA if new IP
 * Otherwise, send 2FA code
 */
router.post('/check-2fa/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
    const { browserInfo } = req.body;
    // Get detailed device info using UAParser (server-side detection)
    const deviceInfo = parseDeviceInfo(req);  // Gets: browser, OS, IP via UAParser
    const ipAddress = deviceInfo.ipAddress;    // Much better than client-side fetch
                    const deviceName = deviceInfo.deviceName;  // e.g., 'Chrome on Windows'
    
    if (!userId) return validationError(res, 'userId is required');
    
    // Check if account is locked
    const lockStatus = await isAccountLocked(userId);
        if (lockStatus.locked) {
      await logAudit(db, {
        userId,
        action: 'LOGIN_BLOCKED_ACCOUNT_LOCKED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'BLOCKED',
        details: { minutesRemaining: lockStatus.minutesRemaining }
      });

      // Return custom rate limit with lock details
      return res.status(429).json({
        success: false,
        locked: true,
        message: `Account locked. Try again in ${lockStatus.minutesRemaining} minute${lockStatus.minutesRemaining !== 1 ? 's' : ''}.`,
        errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
        unlockAt: lockStatus.unlockAt,
        minutesRemaining: lockStatus.minutesRemaining
      });
    }

        // Get user email to check if admin
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userResult = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
      [ENCRYPTION_KEY, userId]
    );
    
    const userEmail = userResult.rows[0]?.email;
    const isAdminUser = userEmail ? await isAdmin(userEmail) : false;
    
    // For ADMINS: Check IP before checking 2FA settings
    if (isAdminUser && ipAddress) {
      const trustedIP = await checkTrustedIP(userId, ipAddress);
      
        if (!trustedIP) {
        // NEW IP detected for admin - FORCE 2FA with ONE email
        // Check if we already sent a code for this user in the last 30 seconds (deduplicate double requests)
        const userIdHash = hashUserId(userId);
                const recentAttempt = await db.query(
          `SELECT id FROM admin_login_attempts 
           WHERE user_id_hash = $1 
           AND attempted_at > NOW() - INTERVAL '60 seconds'`,
          [userIdHash]
        );
        
        if (recentAttempt.rows.length > 0) {
          // Already sent alert recently, return existing temp token without sending duplicate email
          const jwt = await import('jsonwebtoken');
          const tempToken = jwt.default.sign(
            { userId, isTempFor2FA: true, isAdminNewIP: true, ipAddress, deviceName, browserInfo },
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            { expiresIn: '10m' }
          );
          return successResponse(res, {
            success: true,
            userId,
            tempToken,
            requires2FA: true,
            method: 'email',
            message: '2FA code sent to your email - New login location detected',
            isAdminNewIP: true
          });
        }
        
        await logAdminLoginAttempt(userId, ipAddress, deviceName, 'new_ip_detected');
        
        // Generate 2FA code
        const { generate6DigitCode } = await import('../../shared/authUtils.js');
        const code = generate6DigitCode();
        
        // Save verification code
        try {
          await insertVerificationCode(db, userId, userEmail, null, code, 'email');
        } catch (insertErr) {
          return serverError(res, 'Failed to save 2FA code');
        }

                // Build and send ONE email with both code AND alert message via SendGrid
        try {
          const emailHTML = await buildAdminNewIPEmailHTML(code, ipAddress, deviceName);
          const sgMail = (await import('@sendgrid/mail')).default;
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);
          
          const msg = {
            to: userEmail,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com',
            subject: '🔐 New Login Location - 2FA Required',
            html: emailHTML
          };
          
          await sgMail.send(msg);
          await logAdminLoginAttempt(userId, ipAddress, deviceName, 'alert_sent', true);
        } catch (emailErr) {
          return serverError(res, 'Failed to send 2FA code');
        }

        // Generate temporary JWT token
        const jwt = await import('jsonwebtoken');
        const tempToken = jwt.default.sign(
          { userId, isTempFor2FA: true, isAdminNewIP: true, ipAddress, deviceName, browserInfo },
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          { expiresIn: '10m' }
        );
        
        // Log 2FA request
        await logAudit(db, {
          userId,
          action: 'LOGIN_2FA_REQUESTED_ADMIN_NEW_IP',
          resourceType: 'authentication',
          ipAddress: ipAddress,
          userAgent: req.get('user-agent'),
          httpMethod: req.method,
          endpoint: req.path,
          status: 'SUCCESS',
          details: { method: 'email', email: userEmail, reason: 'new_ip_for_admin' }
        });

        return successResponse(res, {
          success: true,
          userId,
          tempToken,
          requires2FA: true,
          method: 'email',
          message: '2FA code sent to your email - New login location detected',
          isAdminNewIP: true
        });
      } else {
        // IP is trusted - update last accessed
        await recordTrustedIP(userId, ipAddress, deviceName, browserInfo);
        await logAdminLoginAttempt(userId, ipAddress, deviceName, 'success');
        
        // Skip 2FA for trusted IP
        return successResponse(res, {
          success: true,
          userId,
          requires2FA: false,
          message: 'Admin login from trusted IP - no 2FA required',
          isAdminTrustedIP: true
        });
      }
    }
    
    // Get 2FA settings using user_id_hash for non-admin users
    const userIdHash = hashUserId(userId);
    
    const twoFAResult = await db.query(
      'SELECT * FROM user_2fa_settings WHERE user_id_hash = $1',
      [userIdHash]
    );

    const twoFASettings = twoFAResult.rows[0];

        // If 2FA disabled, allow access (non-admin users)
    if (!twoFASettings || !twoFASettings.enabled) {
      return successResponse(res, {
        success: true,
        userId,
        requires2FA: false,
        message: 'No 2FA required'
      });
    }

        // 2FA is enabled - check if device is trusted
    
    const userAgent = req.get('user-agent') || '';
    
    // Fetch the session and decrypt to compare
    const deviceCheckResult = await db.query(
      `SELECT id, trust_expiry, is_trusted,
              pgp_sym_decrypt(ip_address_encrypted, $1) as stored_ip,
              pgp_sym_decrypt(user_agent_encrypted, $1) as stored_ua
       FROM security_sessions 
       WHERE user_id_hash = $2`,
      [ENCRYPTION_KEY, userIdHash]
    );
    
    // Check if device matches and is trusted
    let deviceIsTrusted = false;
    if (deviceCheckResult.rows.length > 0) {
      const session = deviceCheckResult.rows[0];
      
      if (session.is_trusted && session.trust_expiry && new Date(session.trust_expiry) > new Date()) {
        // Only check user-agent, not IP (IP changes frequently on mobile)
        if (session.stored_ua === userAgent) {
          deviceIsTrusted = true;
        } 
      } 
    }

    if (deviceIsTrusted) {
      await logAudit(db, {
        userId,
        action: 'LOGIN_2FA_SKIPPED_TRUSTED_DEVICE',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS'
      });
      
      return successResponse(res, {
        success: true,
        userId,
        requires2FA: false,
        message: 'Device is trusted - no 2FA required',
        trustedDevice: true
      });
    }

    // Generate and send 2FA code based on user's preferred method
    const method = twoFASettings.method || 'email'; // Default to email if not set
    
    // Get user's email
    const userInfoResult = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
      [ENCRYPTION_KEY, userId]
    );

    if (userInfoResult.rows.length === 0) {
      return serverError(res, 'User account not found');
    }

    const email = userInfoResult.rows[0].email;
    let sendResult;
    let recipientContact;

    if (method === 'sms') {
      // SMS: Use Twilio Verify API
      const { sendSMS } = await import('../../shared/smsService.js');
      const { decryptPhone } = await import('../../services/security/helpers/securityHelpers.js');
      
      // Get phone number from security table (using proper decryption helper)
      let phoneNumber;
      try {
        const phoneResult = await db.query(
          `SELECT phone_number_encrypted 
           FROM security 
           WHERE user_id_hash = $1`,
          [userIdHash]
        );

        if (phoneResult.rows.length === 0 || !phoneResult.rows[0].phone_number_encrypted) {
          logger.error(`2FA SMS: No phone number found for user ${userId}`);
          return res.status(400).json({
            success: false,
            error: '2FA is set to SMS but no phone number is configured. Please add a phone number in Security Settings or switch to Email verification.',
            errorCode: 'NO_PHONE_NUMBER',
            suggestion: 'Go to Security Settings > Phone Number to add your phone, or change 2FA method to Email'
          });
        }

        // Decrypt using the same helper that encrypted it
        phoneNumber = decryptPhone(phoneResult.rows[0].phone_number_encrypted);
        
        if (!phoneNumber) {
          throw new Error('Decryption returned null');
        }
      } catch (decryptError) {
        logger.error(`2FA SMS: Phone decryption error for user ${userId}:`, decryptError.message);
        return res.status(400).json({
          success: false,
          error: '2FA is set to SMS but your phone number could not be retrieved. Please re-add your phone number in Security Settings or switch to Email verification.',
          errorCode: 'PHONE_DECRYPT_ERROR',
          suggestion: 'Go to Security Settings > Phone Number to re-add your phone, or change 2FA method to Email'
        });
      }
      
      recipientContact = phoneNumber;
      
      // Send via Twilio Verify API (with retry logic and rate limiting)
      sendResult = await sendSMS(phoneNumber);
      
      logger.info(`2FA SMS send result for ${userId}:`, { 
        success: sendResult?.success, 
        mockMode: sendResult?.mockMode,
        error: sendResult?.error,
        rateLimited: sendResult?.rateLimited,
        code: sendResult?.code
      });
      
      if (!sendResult || !sendResult.success) {
        logger.error(`2FA SMS failed for user ${userId}: ${sendResult?.error || 'Unknown error'}`);
        
        // Handle rate limiting errors with specific response
        if (sendResult?.code === 'RATE_LIMITED' || sendResult?.rateLimited) {
          return res.status(429).json({
            success: false,
            error: sendResult?.error || 'Too many SMS requests. Please try again in a few minutes.',
            errorCode: 'SMS_RATE_LIMITED',
            waitSeconds: sendResult?.waitSeconds,
            suggestion: 'Please wait before requesting another verification code, or switch to Email verification in your Security Settings.'
          });
        }
        
        // CRITICAL: If Twilio Verify is not configured, block login
        if (sendResult?.mockMode) {
          return res.status(503).json({
            success: false,
            error: 'SMS verification service is not configured. Please contact support or use email verification.',
            errorCode: 'SMS_SERVICE_UNAVAILABLE'
          });
        }
        
        return serverError(res, `Failed to send 2FA code via SMS: ${sendResult?.error || 'Unknown error'}`);
      }
    } else {
      // Email: Use manual code generation and email
      const { generate6DigitCode } = await import('../../shared/authUtils.js');
      const { send2FACodeEmail } = await import('../../shared/emailService.js');
      
      const code = generate6DigitCode();
      recipientContact = email;

      // Insert verification code with encryption
      try {
        await insertVerificationCode(db, userId, email, null, code, 'email');
      } catch (insertErr) {
        return serverError(res, 'Failed to save 2FA code');
      }

      // Send 2FA code via email
      sendResult = await send2FACodeEmail(email, code);
      if (!sendResult || !sendResult.success) {
        return serverError(res, 'Failed to send 2FA code via email');
      }
    }

    // Generate temporary JWT token
    const jwt = await import('jsonwebtoken');
    const tempToken = jwt.default.sign(
      { userId, isTempFor2FA: true },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '10m' }
    );

    // Log 2FA request
    await logAudit(db, {
      userId,
      action: 'LOGIN_2FA_REQUESTED',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { method, contact: recipientContact }
    });

    return successResponse(res, {
      success: true,
      userId,
      tempToken,
      requires2FA: true,
      method,
      message: method === 'sms' 
        ? '2FA code sent via SMS' 
        : '2FA code sent to your email'
    });
  } catch (error) {
    logger.error('Error in check-2fa endpoint:', error);
    logger.error('Error stack:', error.stack);
    return serverError(res, `Failed to process 2FA request: ${error.message}`);
  }
});

/**
 * GET /auth/check-current-device-trust/:userId
 * Check if current device is trusted
 */
router.get('/check-current-device-trust/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return forbiddenError(res, 'Unauthorized');
    }

    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const ipAddress = req.ip || '';
    const userAgent = req.get('user-agent') || '';

    const result = await db.query(
      `SELECT id, trust_expiry, is_trusted,
              pgp_sym_decrypt(ip_address_encrypted, $1) as stored_ip,
              pgp_sym_decrypt(user_agent_encrypted, $1) as stored_ua
       FROM security_sessions 
       WHERE user_id_hash = $2`,
      [ENCRYPTION_KEY, userIdHash]
    );

    let isTrusted = false;
    if (result.rows.length > 0) {
      const session = result.rows[0];
      if (session.is_trusted && session.trust_expiry && new Date(session.trust_expiry) > new Date()) {
        // Only check user-agent, not IP (IP changes frequently on mobile)
        if (session.stored_ua === userAgent) {
          isTrusted = true;
        }
      }
    }

    return successResponse(res, { success: true, isTrusted });
  } catch (err) {
    return serverError(res, 'Failed to check device trust status');
  }
});

/**
 * POST /auth/trust-current-device/:userId
 * Trust the current device for 30 days
 * For ADMINS: Also adds IP to admin_trusted_ips table
 */
router.post('/trust-current-device/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return forbiddenError(res, 'Unauthorized');
    }

    const userIdHash = hashUserId(userId);
    const userAgent = req.get('user-agent') || '';
    const ipAddress = req.ip || '';
    const deviceName = extractDeviceName(userAgent);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    // Check if user is admin
    const userResult = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
      [ENCRYPTION_KEY, userId]
    );
    
    const userEmail = userResult.rows[0]?.email;
    const isAdminUser = userEmail ? await isAdmin(userEmail) : false;

    // For ADMINS: Add IP to admin_trusted_ips table (this is what admin 2FA checks)
    if (isAdminUser) {
      const { browserInfo } = req.body;
      const deviceInfo = parseDeviceInfo(req);
      await recordTrustedIP(userId, ipAddress, deviceInfo.deviceName || deviceName, browserInfo);
      
      await logAudit(db, {
        userId,
        action: 'ADMIN_IP_TRUSTED_FROM_SETTINGS',
        resourceType: 'security',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS'
      });

      return successResponse(res, { 
        success: true, 
        message: 'Device trusted. You won\'t need 2FA from this IP for future logins.' 
      });
    }

    // For REGULAR USERS: Update security_sessions table (UPSERT pattern)
    const updateResult = await db.query(
      `UPDATE security_sessions 
       SET device_name_encrypted = pgp_sym_encrypt($2, $3),
           ip_address_encrypted = pgp_sym_encrypt($4, $3),
           user_agent_encrypted = pgp_sym_encrypt($5, $3),
           is_trusted = true,
           trust_expiry = NOW() + INTERVAL '30 days',
           last_active = NOW()
       WHERE user_id_hash = $1
       RETURNING id`,
      [userIdHash, deviceName, ENCRYPTION_KEY, ipAddress, userAgent]
    );

    // If no row was updated, insert new one
    if (updateResult.rows.length === 0) {
      await db.query(
        `INSERT INTO security_sessions (user_id_hash, device_name_encrypted, ip_address_encrypted, user_agent_encrypted, is_trusted, trust_expiry, last_active, created_at)
         VALUES ($1, pgp_sym_encrypt($2, $3), pgp_sym_encrypt($4, $3), pgp_sym_encrypt($5, $3), true, NOW() + INTERVAL '30 days', NOW(), NOW())`,
        [userIdHash, deviceName, ENCRYPTION_KEY, ipAddress, userAgent]
      );
    }

    await logAudit(db, {
      userId,
      action: 'DEVICE_TRUSTED_FROM_SETTINGS',
      resourceType: 'security',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    });

    return successResponse(res, { success: true, message: 'Device trusted for 30 days' });
  } catch (err) {
    return serverError(res, 'Failed to trust device');
  }
});

/**
 * POST /auth/revoke-current-device-trust/:userId
 * Revoke trust on the current device
 */
router.post('/revoke-current-device-trust/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return forbiddenError(res, 'Unauthorized');
    }

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

    await logAudit(db, {
      userId,
      action: 'DEVICE_TRUST_REVOKED_FROM_SETTINGS',
      resourceType: 'security',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    });

    return successResponse(res, { success: true, message: 'Device trust revoked' });
  } catch (err) {
    return serverError(res, 'Failed to revoke device trust');
  }
});

/**
 * GET /auth/trusted-devices/:userId
 * Get all trusted devices for user
 */
router.get('/trusted-devices/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return forbiddenError(res, 'Unauthorized');
    }

    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    const result = await db.query(
      `SELECT 
        id,
        pgp_sym_decrypt(device_name_encrypted, $1) as device_name,
        created_at,
        last_active,
        trust_expiry
       FROM security_sessions 
       WHERE user_id_hash = $2 
       AND is_trusted = true
       ORDER BY last_active DESC`,
      [ENCRYPTION_KEY, userIdHash]
    );

    return successResponse(res, { success: true, devices: result.rows });
  } catch (err) {
    return serverError(res, 'Failed to fetch trusted devices');
  }
});

/**
 * POST /auth/trust-admin-device
 * After successful 2FA from new IP, add IP to trusted list for admin
 */
router.post('/trust-admin-device', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { browserInfo } = req.body;
    
    // Detect IP and device server-side (same as in check-2fa)
    const deviceInfo = parseDeviceInfo(req);
    const ipAddress = deviceInfo.ipAddress;
    const deviceName = deviceInfo.deviceName;
    
        
    
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userResult = await db.query(
      `SELECT is_admin FROM user_personal_info WHERE user_id = $1`,
      [userId]
    );
    
    const user = userResult.rows[0];
    if (!user || !user.is_admin) {
      return forbiddenError(res, 'Not authorized');
    }
    
    await recordTrustedIP(userId, ipAddress, deviceName, browserInfo);
    await logAdminLoginAttempt(userId, ipAddress, deviceName, '2fa_passed');
    
    await logAudit(db, {
      userId,
      action: 'ADMIN_DEVICE_TRUSTED_AFTER_2FA',
      resourceType: 'security',
      ipAddress: ipAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { deviceName }
    });
    
    return successResponse(res, { 
      success: true, 
      message: 'Device trusted. You won\'t need 2FA from this IP again.'
    });
  } catch (err) {
    return serverError(res, 'Failed to trust device');
  }
});

/**
 * DELETE /auth/trusted-device/:userId/:deviceId
 * Revoke trust on a device
 */
router.delete('/trusted-device/:userId/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { userId, deviceId } = req.params;
    
    if (req.user.uid !== userId) {
      return forbiddenError(res, 'Unauthorized');
    }

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

    await logAudit(db, {
      userId,
      action: 'TRUSTED_DEVICE_REVOKED',
      resourceType: 'security',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { deviceId }
    });

    return successResponse(res, { success: true, message: 'Device trust revoked' });
  } catch (err) {
    return serverError(res, 'Failed to revoke device trust');
  }
});

export default router;
