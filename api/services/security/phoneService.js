import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { encryptPhone, decryptPhone, generateVerificationCodeWithExpiry, logVerificationCode } from './helpers/securityHelpers.js';
import { insertVerificationCode, getVerificationCode } from '../../shared/encryptedQueries.js';

/**
 * Get phone data
 */
export async function getPhoneData(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      'SELECT phone_number, recovery_phone, phone_verified, recovery_phone_verified FROM security WHERE user_id_hash = $1',
      [userIdHash]
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
    const userIdHash = hashUserId(userId);
    const encryptedPhone = encryptPhone(phoneNumber);
    const encryptedRecovery = encryptPhone(recoveryPhone);

    await db.query(
      `INSERT INTO security (user_id, user_id_hash, phone_number, recovery_phone, phone_verified, recovery_phone_verified)
       VALUES ($1, $2, $3, $4, FALSE, FALSE)
       ON CONFLICT (user_id_hash) 
       DO UPDATE SET 
         phone_number = EXCLUDED.phone_number,
         recovery_phone = EXCLUDED.recovery_phone,
         phone_verified = FALSE,
         recovery_phone_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, userIdHash, encryptedPhone, encryptedRecovery]
    );

    const { code, expiresAt } = generateVerificationCodeWithExpiry();

    // Use encrypted queries for verification code
    await insertVerificationCode(db, userId, null, phoneNumber, code, 'sms');

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
    const userIdHash = hashUserId(userId);
    
    const result = await getVerificationCode(db, userId, code);

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    const { id, phone_number } = result.rows[0];

    await db.query(
      'UPDATE verification_codes SET verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    await db.query(
      `UPDATE security SET phone_verified = TRUE 
       WHERE user_id_hash = $1 AND phone_number_encrypted = pgp_sym_encrypt($2, $3)`,
      [userIdHash, phone_number || '', process.env.ENCRYPTION_KEY]
    );

    return { success: true, verified: true };
  } catch (err) {
    console.error('[SECURITY] Error verifying phone code:', err);
    throw err;
  }
}
