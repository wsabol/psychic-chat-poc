import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { decryptPhone, decryptEmail } from './helpers/securityHelpers.js';

/**
 * Get all verification methods for a user (phone, recovery phone, recovery email).
 * Also resolves the user's primary email from user_personal_info so callers
 * do not need to perform a separate DB lookup.
 * Used by: VerificationMethodsTab
 *
 * SECURITY: All fields are encrypted with pgp_sym_encrypt (same key as phoneService).
 */
export async function getVerificationMethods(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    // Fetch the user's primary email from user_personal_info
    const emailResult = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email
       FROM user_personal_info
       WHERE user_id = $2`,
      [ENCRYPTION_KEY, userId]
    );
    const userEmail = emailResult.rows[0]?.email ?? '';

    // SECURITY: Decrypt using PGCRYPTO (same as phoneService)
    const securityResult = await db.query(
      `SELECT 
        pgp_sym_decrypt(phone_number_encrypted::bytea, $1::text) as phone_number,
        pgp_sym_decrypt(recovery_phone_encrypted::bytea, $1::text) as recovery_phone,
        pgp_sym_decrypt(recovery_email_encrypted::bytea, $1::text) as recovery_email,
        phone_verified, 
        recovery_phone_verified, 
        recovery_email_verified
       FROM security 
       WHERE user_id_hash = $2`,
      [ENCRYPTION_KEY, userIdHash]
    );

    if (securityResult.rows.length === 0) {
      return {
        primaryEmail: userEmail,
        phoneNumber: null,
        recoveryPhone: null,
        recoveryEmail: null,
        phoneVerified: false,
        recoveryPhoneVerified: false,
        recoveryEmailVerified: false
      };
    }

    const sec = securityResult.rows[0];
    return {
      primaryEmail: userEmail,
      phoneNumber: sec.phone_number,
      recoveryPhone: sec.recovery_phone,
      recoveryEmail: sec.recovery_email,
      phoneVerified: sec.phone_verified || false,
      recoveryPhoneVerified: sec.recovery_phone_verified || false,
      recoveryEmailVerified: sec.recovery_email_verified || false
    };
  } catch (err) {
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}
