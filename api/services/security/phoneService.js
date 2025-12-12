import { db } from '../../shared/db.js';
import { encryptPhone, decryptPhone, generateVerificationCodeWithExpiry, logVerificationCode } from './helpers/securityHelpers.js';

/**
 * Get phone data
 */
export async function getPhoneData(userId) {
  try {
    const result = await db.query(
      'SELECT phone_number, recovery_phone, phone_verified, recovery_phone_verified FROM security WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { phoneNumber: null, recoveryPhone: null };
    }

    const row = result.rows[0];
    return {
      phoneNumber: decryptPhone(row.phone_number),
      recoveryPhone: decryptPhone(row.recovery_phone),
      phoneVerified: row.phone_verified,
      recoveryPhoneVerified: row.recovery_phone_verified
    };
  } catch (err) {
    console.error('[SECURITY] Error getting phone data:', err);
    throw err;
  }
}

/**
 * Save phone and send verification code
 */
export async function savePhoneNumber(userId, phoneNumber, recoveryPhone) {
  try {
    const encryptedPhone = encryptPhone(phoneNumber);
    const encryptedRecovery = encryptPhone(recoveryPhone);

    await db.query(
      `INSERT INTO security (user_id, phone_number, recovery_phone, phone_verified, recovery_phone_verified)
       VALUES ($1, $2, $3, FALSE, FALSE)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         phone_number = $2,
         recovery_phone = $3,
         phone_verified = FALSE,
         recovery_phone_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, encryptedPhone, encryptedRecovery]
    );

    const { code, expiresAt } = generateVerificationCodeWithExpiry();

    await db.query(
      `INSERT INTO verification_codes (user_id, phone_number, code, code_type, expires_at)
       VALUES ($1, $2, $3, 'sms', $4)`,
      [userId, phoneNumber, code, expiresAt]
    );

    logVerificationCode('sms', code);

    return { success: true, codeSent: true };
  } catch (err) {
    console.error('[SECURITY] Error saving phone:', err);
    throw err;
  }
}

/**
 * Verify phone code
 */
export async function verifyPhoneCode(userId, code) {
  try {
    const result = await db.query(
      `SELECT id, phone_number FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND code_type = 'sms' 
       AND expires_at > NOW() AND verified_at IS NULL`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    const { id, phone_number } = result.rows[0];

    await db.query(
      'UPDATE verification_codes SET verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    const encryptedPhone = encryptPhone(phone_number);
    await db.query(
      `UPDATE security SET phone_verified = TRUE 
       WHERE user_id = $1 AND phone_number = $2`,
      [userId, encryptedPhone]
    );

    return { success: true, verified: true };
  } catch (err) {
    console.error('[SECURITY] Error verifying phone code:', err);
    throw err;
  }
}
