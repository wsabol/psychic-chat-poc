import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { decryptPhone, decryptEmail } from './helpers/securityHelpers.js';

/**
 * Get verification methods (all from security table)
 * Used by: VerificationMethodsTab
 * Combines phone + email + recovery phone into single view
 * 
 * SECURITY: All fields are encrypted at APPLICATION level using AES-256-GCM
 * Fetch encrypted data, then decrypt at application level (not database level)
 */
export async function getVerificationMethods(userId, userEmail) {
  try {
    const userIdHash = hashUserId(userId);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    console.log('[VERIFICATION] Getting methods for userId:', userId);
    console.log('[VERIFICATION] User ID Hash:', userIdHash);
    
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
    
    console.log('[VERIFICATION] Query returned', securityResult.rows.length, 'rows');
    if (securityResult.rows.length > 0) {
      console.log('[VERIFICATION] Phone number:', securityResult.rows[0].phone_number);
      console.log('[VERIFICATION] Phone verified:', securityResult.rows[0].phone_verified);
    }

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
    const { logErrorFromCatch } = await import('../../shared/errorLogger.js');
    logErrorFromCatch(err, 'app', 'security');
    throw err;
  }
}
