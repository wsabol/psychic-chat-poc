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
    
    // SECURITY: Fetch encrypted data as-is, decrypt at application level
    const securityResult = await db.query(
      `SELECT 
        phone_number_encrypted,
        recovery_phone_encrypted,
        recovery_email_encrypted,
        phone_verified, recovery_phone_verified, recovery_email_verified
       FROM security WHERE user_id_hash = $1`,
      [userIdHash]
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
      phoneNumber: decryptPhone(sec.phone_number_encrypted),
      recoveryPhone: decryptPhone(sec.recovery_phone_encrypted),
      recoveryEmail: decryptEmail(sec.recovery_email_encrypted),
      phoneVerified: sec.phone_verified || false,
      recoveryPhoneVerified: sec.recovery_phone_verified || false,
      recoveryEmailVerified: sec.recovery_email_verified || false
    };
  } catch (err) {
    logErrorFromCatch(error, 'app', 'security');
    throw err;
  }
}
