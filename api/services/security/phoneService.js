import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { encryptPhone, decryptPhone } from './helpers/securityHelpers.js';
import { sendSMS, verifySMSCode } from '../../shared/smsService.js';
import { formatPhoneNumber } from '../../shared/authUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Get phone data
 */
export async function getPhoneData(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      'SELECT phone_number_encrypted, recovery_phone_encrypted, phone_verified, recovery_phone_verified FROM security WHERE user_id_hash = $1',
      [userIdHash]
    );

    if (result.rows.length === 0) {
      return { phoneNumber: null, recoveryPhone: null };
    }

    const row = result.rows[0];
    return {
      phoneNumber: decryptPhone(row.phone_number_encrypted),
      recoveryPhone: decryptPhone(row.recovery_phone_encrypted),
      phoneVerified: row.phone_verified,
      recoveryPhoneVerified: row.recovery_phone_verified
    };
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}

/**
 * Save phone number and send SMS verification code via Twilio Verify API
 * Uses Twilio Verify service - code generation and expiration handled by Twilio
 */
export async function savePhoneNumber(userId, phoneNumber, recoveryPhone) {
  try {
    const userIdHash = hashUserId(userId);
    
    // Format phone numbers to E.164 format for Twilio
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const formattedRecovery = recoveryPhone ? formatPhoneNumber(recoveryPhone) : null;
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number format. Use: +1 (555) 000-0000 or +18005550000');
    }
    
    const encryptedPhone = encryptPhone(formattedPhone);
    const encryptedRecovery = formattedRecovery ? encryptPhone(formattedRecovery) : null;

    // Try UPDATE first using user_id_hash
    const updateResult = await db.query(
      `UPDATE security SET 
         phone_number_encrypted = $1,
         recovery_phone_encrypted = $2,
         phone_verified = FALSE,
         recovery_phone_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id_hash = $3`,
      [encryptedPhone, encryptedRecovery || null, userIdHash]
    );

    // If no rows updated, INSERT
    if (updateResult.rowCount === 0) {
      await db.query(
        `INSERT INTO security (user_id_hash, phone_number_encrypted, recovery_phone_encrypted, phone_verified, recovery_phone_verified, created_at, updated_at)
         VALUES ($1, $2, $3, FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userIdHash, encryptedPhone, encryptedRecovery || null]
      );
    }

    // Send SMS verification using Twilio Verify API (no code parameter needed)
    const smsResult = await sendSMS(formattedPhone);
    
    return { 
      success: smsResult.success, 
      codeSent: smsResult.success,
      message: smsResult.message || (smsResult.success 
        ? `Verification code sent via SMS to ${formattedPhone}` 
        : 'Failed to send verification code')
    };
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}

/**
 * Verify phone code using Twilio Verify API
 * Validates the code with Twilio, then marks phone as verified in database
 */
export async function verifyPhoneCode(userId, code) {
  try {
    const userIdHash = hashUserId(userId);
    
    // Validate code format (must be 6 digits)
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return { success: false, error: 'Invalid verification code format' };
    }

    // Get the phone number from database
    const phoneResult = await db.query(
      'SELECT phone_number_encrypted FROM security WHERE user_id_hash = $1',
      [userIdHash]
    );

    if (phoneResult.rowCount === 0) {
      return { success: false, error: 'No phone number on file' };
    }

    const phoneNumber = decryptPhone(phoneResult.rows[0].phone_number_encrypted);
    
    if (!phoneNumber) {
      return { success: false, error: 'No phone number on file' };
    }

    // Verify the code with Twilio Verify API
    const verifyResult = await verifySMSCode(phoneNumber, code);

    if (!verifyResult.success || !verifyResult.valid) {
      return { 
        success: false, 
        error: verifyResult.message || 'Invalid or expired verification code' 
      };
    }

    // Mark phone as verified in database
    const updateResult = await db.query(
      `UPDATE security SET 
         phone_verified = TRUE,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id_hash = $1
       RETURNING phone_verified`,
      [userIdHash]
    );

    if (updateResult.rowCount === 0) {
      return { success: false, error: 'Failed to update verification status' };
    }

    return { 
      success: true, 
      verified: true, 
      message: 'Phone number verified successfully' 
    };
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}
