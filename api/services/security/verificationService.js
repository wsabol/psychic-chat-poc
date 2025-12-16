import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

/**
 * Get verification methods (all from security table - all encrypted with pgp_sym_encrypt)
 * Used by: VerificationMethodsTab
 * Combines phone + email + recovery phone into single view
 * SECURITY: All fields decrypted at database level
 */
export async function getVerificationMethods(userId, userEmail) {
  try {
    const userIdHash = hashUserId(userId);
    
    // SECURITY: All phone/email fields are encrypted at database level
    // Decrypt them using pgp_sym_decrypt in the SQL query
    const securityResult = await db.query(
      `SELECT 
        pgp_sym_decrypt(phone_number_encrypted, $1) as phone_number,
        pgp_sym_decrypt(recovery_phone_encrypted, $1) as recovery_phone,
        pgp_sym_decrypt(recovery_email_encrypted, $1) as recovery_email,
        phone_verified, recovery_phone_verified, recovery_email_verified
       FROM security WHERE user_id_hash = $2`,
      [process.env.ENCRYPTION_KEY, userIdHash]
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
      phoneNumber: sec.phone_number,  // Already decrypted by SQL
      recoveryPhone: sec.recovery_phone,  // Already decrypted by SQL
      recoveryEmail: sec.recovery_email,  // Already decrypted by SQL
      phoneVerified: sec.phone_verified || false,
      recoveryPhoneVerified: sec.recovery_phone_verified || false,
      recoveryEmailVerified: sec.recovery_email_verified || false
    };
  } catch (err) {
    console.error('[SECURITY] Error getting verification methods:', err);
    throw err;
  }
}
