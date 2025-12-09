import { db } from '../../shared/db.js';
import { decryptPhone, decryptEmail } from './helpers/securityHelpers.js';

/**
 * Get verification methods (all from security table - all encrypted)
 * Used by: VerificationMethodsTab
 * Combines phone + email + recovery phone into single view
 */
export async function getVerificationMethods(userId, userEmail) {
  try {
    const securityResult = await db.query(
      `SELECT phone_number, recovery_phone, recovery_email, phone_verified, recovery_phone_verified, recovery_email_verified
       FROM security WHERE user_id = $1`,
      [userId]
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
      phoneNumber: decryptPhone(sec.phone_number),
      recoveryPhone: decryptPhone(sec.recovery_phone),
      recoveryEmail: decryptEmail(sec.recovery_email),
      phoneVerified: sec.phone_verified || false,
      recoveryPhoneVerified: sec.recovery_phone_verified || false,
      recoveryEmailVerified: sec.recovery_email_verified || false
    };
  } catch (err) {
    console.error('[SECURITY] Error getting verification methods:', err);
    throw err;
  }
}
