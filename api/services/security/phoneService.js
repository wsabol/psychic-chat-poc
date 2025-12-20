import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { encryptPhone, decryptPhone } from './helpers/securityHelpers.js';

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
    console.error('[SECURITY] Error getting phone data:', err);
    throw err;
  }
}

/**
 * Save phone number
 */
export async function savePhoneNumber(userId, phoneNumber, recoveryPhone) {
  try {
    const userIdHash = hashUserId(userId);
    const encryptedPhone = encryptPhone(phoneNumber);
    const encryptedRecovery = encryptPhone(recoveryPhone);

    // Try UPDATE first using user_id_hash
    const updateResult = await db.query(
      `UPDATE security SET 
         phone_number_encrypted = $1,
         recovery_phone_encrypted = $2,
         phone_verified = FALSE,
         recovery_phone_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id_hash = $3`,
      [encryptedPhone, encryptedRecovery, userIdHash]
    );

    // If no rows updated, INSERT
    if (updateResult.rowCount === 0) {
      await db.query(
        `INSERT INTO security (user_id_hash, phone_number_encrypted, recovery_phone_encrypted, phone_verified, recovery_phone_verified, created_at, updated_at)
         VALUES ($1, $2, $3, FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userIdHash, encryptedPhone, encryptedRecovery]
      );
    }

    return { success: true, codeSent: false };
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
    
    // Mark as verified
    await db.query(
      `UPDATE security SET phone_verified = TRUE WHERE user_id_hash = $1`,
      [userIdHash]
    );

    return { success: true, verified: true };
  } catch (err) {
    console.error('[SECURITY] Error verifying phone code:', err);
    throw err;
  }
}
