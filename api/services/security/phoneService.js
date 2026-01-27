import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { encryptPhone, decryptPhone } from './helpers/securityHelpers.js';
import { sendSMS, verifySMSCode } from '../../shared/smsService.js';
import { formatPhoneNumber } from '../../shared/authUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Get phone data - DECRYPT WITH PGCRYPTO
 */
export async function getPhoneData(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    const result = await db.query(
      `SELECT 
        pgp_sym_decrypt(phone_number_encrypted::bytea, $1::text) as phone_number,
        pgp_sym_decrypt(recovery_phone_encrypted::bytea, $1::text) as recovery_phone,
        phone_verified, 
        recovery_phone_verified 
       FROM security 
       WHERE user_id_hash = $2`,
      [ENCRYPTION_KEY, userIdHash]
    );

    if (result.rows.length === 0) {
      return { phoneNumber: null, recoveryPhone: null };
    }

    const row = result.rows[0];
    return {
      phoneNumber: row.phone_number,
      recoveryPhone: row.recovery_phone,
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
 * USES PGCRYPTO - Same encryption as user_personal_info table
 */
export async function savePhoneNumber(userId, phoneNumber, recoveryPhone) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    // Format phone numbers to E.164 format for Twilio
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const formattedRecovery = recoveryPhone ? formatPhoneNumber(recoveryPhone) : null;
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number format. Use: +1 (555) 000-0000 or +18005550000');
    }

    // Try UPDATE first using user_id_hash - ENCRYPT IN DATABASE LIKE PERSONAL INFO
    const updateResult = await db.query(
      `UPDATE security SET 
         phone_number_encrypted = pgp_sym_encrypt($1, $2),
         recovery_phone_encrypted = $3,
         phone_verified = FALSE,
         recovery_phone_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id_hash = $4`,
      [formattedPhone, ENCRYPTION_KEY, formattedRecovery ? `pgp_sym_encrypt('${formattedRecovery}', '${ENCRYPTION_KEY}')` : null, userIdHash]
    );

    // If no rows updated, INSERT
    if (updateResult.rowCount === 0) {
      await db.query(
        `INSERT INTO security (user_id_hash, phone_number_encrypted, recovery_phone_encrypted, phone_verified, recovery_phone_verified, created_at, updated_at)
         VALUES ($1, pgp_sym_encrypt($2, $3), $4, FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userIdHash, formattedPhone, ENCRYPTION_KEY, formattedRecovery ? `pgp_sym_encrypt('${formattedRecovery}', '${ENCRYPTION_KEY}')` : null]
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
 * DECRYPT WITH PGCRYPTO
 */
export async function verifyPhoneCode(userId, code) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    // Validate code format (must be 6 digits)
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return { success: false, error: 'Invalid verification code format' };
    }

    // Get the phone number from database - DECRYPT WITH PGCRYPTO
    const phoneResult = await db.query(
      `SELECT pgp_sym_decrypt(phone_number_encrypted::bytea, $1::text) as phone_number
       FROM security 
       WHERE user_id_hash = $2`,
      [ENCRYPTION_KEY, userIdHash]
    );

    if (phoneResult.rowCount === 0) {
      return { success: false, error: 'No phone number on file' };
    }

    const phoneNumber = phoneResult.rows[0].phone_number;
    
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
