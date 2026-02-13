import { db } from '../../shared/db.js';
import { generate6DigitCode } from '../../shared/authUtils.js';
import { insertVerificationCode, getVerificationCode } from '../../shared/encryptedQueries.js';
import { send2FACodeEmail } from '../../shared/emailService.js';
import { sendSMS, verifySMSCode } from '../../shared/smsService-aws.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { SECURITY_CONFIG } from '../../config/security.js';

/**
 * Verification Code Service
 * Handles generation, sending, and verification of codes for 2FA and other security flows
 * 
 * NOTE: SMS verification uses Twilio Verify API (code managed by Twilio)
 *       Email verification uses manual code generation (stored in database)
 */

/**
 * Generate and send a verification code via email or SMS
 * @param {string} userId - User ID
 * @param {string} emailOrPhone - Email address or phone number
 * @param {string} method - 'email' or 'sms'
 * @param {string} codeType - Type of code (login, password_reset, etc.)
 * @returns {Promise<Object>} Result with success status
 */
export async function generateAndSendVerificationCode(userId, emailOrPhone, method = 'email', codeType = 'login') {
  try {
    let sendResult;
    
    if (method === SECURITY_CONFIG.VERIFICATION_METHODS.EMAIL) {
      // Email: Generate code and store in database
      const code = generate6DigitCode();
      
      const insertResult = await insertVerificationCode(db, userId, emailOrPhone, null, code, method);
      
      if (!insertResult) {
        return { success: false, error: 'Failed to save verification code' };
      }

      sendResult = await send2FACodeEmail(emailOrPhone, code);
      
      if (!sendResult || !sendResult.success) {
        return { success: false, error: 'Failed to send verification code' };
      }
      
      return { success: true, code }; // Return code for testing
      
    } else if (method === SECURITY_CONFIG.VERIFICATION_METHODS.SMS) {
      // SMS: Use Twilio Verify API (code managed by Twilio, not stored in DB)
      sendResult = await sendSMS(emailOrPhone);
      
      if (!sendResult || !sendResult.success) {
        return { success: false, error: sendResult.error || 'Failed to send verification code' };
      }
      
      return { success: true, message: sendResult.message };
      
    } else {
      return { success: false, error: 'Invalid verification method' };
    }
  } catch (error) {
    logErrorFromCatch(error, 'app', 'verificationCodeService.generateAndSendVerificationCode');
    return { success: false, error: error.message };
  }
}

/**
 * Verify a code submitted by the user (Email-based verification)
 * For SMS verification, use verifySMSVerificationCode() instead
 * @param {string} userId - User ID
 * @param {string} code - Code to verify
 * @param {string} codeType - Type of code (login, password_reset, etc.)
 * @returns {Promise<Object>} Result with success status and code record if valid
 */
export async function verifyCode(userId, code, codeType = 'login') {
  try {
    // Fetch verification code from database (for EMAIL verification)
    const codeResult = await getVerificationCode(db, userId, code);
    
    if (!codeResult || codeResult.rows.length === 0) {
      return { success: false, error: 'Invalid or expired code' };
    }

    const codeRecord = codeResult.rows[0];

    // Mark code as verified
    await db.query(
      'UPDATE verification_codes SET verified_at = NOW() WHERE id = $1',
      [codeRecord.id]
    );

    return { success: true, codeRecord };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'verificationCodeService.verifyCode');
    return { success: false, error: error.message };
  }
}

/**
 * Verify SMS code using Twilio Verify API
 * This is used for SMS-based 2FA verification
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} code - 6-digit verification code
 * @returns {Promise<Object>} Result with verification status
 */
export async function verifySMSVerificationCode(phoneNumber, code) {
  try {
    // Validate code format
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return { success: false, error: 'Invalid verification code format' };
    }

    // Verify through Twilio Verify API
    const verifyResult = await verifySMSCode(phoneNumber, code);

    if (!verifyResult.success || !verifyResult.valid) {
      return { 
        success: false, 
        error: verifyResult.message || 'Invalid or expired verification code' 
      };
    }

    return { 
      success: true, 
      valid: true,
      message: 'Code verified successfully' 
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'verificationCodeService.verifySMSVerificationCode');
    return { success: false, error: error.message };
  }
}

/**
 * Invalidate a verification code (mark as used)
 * @param {number} codeId - Database ID of the code
 * @returns {Promise<Object>} Result with success status
 */
export async function invalidateCode(codeId) {
  try {
    await db.query(
      'UPDATE verification_codes SET verified_at = NOW() WHERE id = $1',
      [codeId]
    );
    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'verificationCodeService.invalidateCode');
    return { success: false, error: error.message };
  }
}

/**
 * Check if a code was recently sent to prevent spam
 * @param {string} userId - User ID (hashed)
 * @param {number} cooldownSeconds - Cooldown period in seconds
 * @returns {Promise<boolean>} True if code was recently sent
 */
export async function wasCodeRecentlySent(userId, cooldownSeconds = 60) {
  try {
    const result = await db.query(
      `SELECT id FROM verification_codes 
       WHERE user_id = $1 
       AND created_at > NOW() - INTERVAL '${cooldownSeconds} seconds'
       LIMIT 1`,
      [userId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'verificationCodeService.wasCodeRecentlySent');
    return false;
  }
}

/**
 * Cleanup expired verification codes (for scheduled jobs)
 * @param {number} expiryMinutes - Delete codes older than this many minutes
 * @returns {Promise<Object>} Result with count of deleted codes
 */
export async function cleanupExpiredCodes(expiryMinutes = 60) {
  try {
    const result = await db.query(
      `DELETE FROM verification_codes 
       WHERE created_at < NOW() - INTERVAL '${expiryMinutes} minutes'
       RETURNING id`
    );
    
    return { success: true, deletedCount: result.rows.length };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'verificationCodeService.cleanupExpiredCodes');
    return { success: false, error: error.message };
  }
}

/**
 * Get verification code attempts count for rate limiting
 * @param {string} userId - User ID
 * @param {number} windowMinutes - Time window to check
 * @returns {Promise<number>} Number of attempts in the window
 */
export async function getCodeAttemptCount(userId, windowMinutes = 10) {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM verification_codes 
       WHERE user_id = $1 
       AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
      [userId]
    );
    
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logErrorFromCatch(error, 'app', 'verificationCodeService.getCodeAttemptCount');
    return 0;
  }
}
