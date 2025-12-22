import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { encryptEmail, decryptEmail, generateVerificationCodeWithExpiry, logVerificationCode } from './helpers/securityHelpers.js';
import { insertVerificationCode, getVerificationCode } from '../../shared/encryptedQueries.js';

/**
 * Get email data
 */
export async function getEmailData(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      'SELECT recovery_email_encrypted, recovery_email_verified FROM security WHERE user_id_hash = $1',
      [userIdHash]
    );

    if (result.rows.length === 0) {
      return { recoveryEmail: null, recoveryEmailVerified: false };
    }

    const row = result.rows[0];
    return {
      recoveryEmail: row.recovery_email_encrypted ? decryptEmail(row.recovery_email_encrypted) : null,
      recoveryEmailVerified: row.recovery_email_verified
    };
  } catch (err) {
    console.error('[SECURITY] Error getting email data:', err);
    throw err;
  }
}

/**
 * Save recovery email and send verification code
 */
export async function saveRecoveryEmail(userId, recoveryEmail) {
  try {
    const userIdHash = hashUserId(userId);

    await db.query(
      `INSERT INTO security (user_id_hash, recovery_email_encrypted, recovery_email_verified, created_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id_hash) 
       DO UPDATE SET 
         recovery_email_encrypted = pgp_sym_encrypt($2, $3),
         recovery_email_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [userIdHash, recoveryEmail || '', process.env.ENCRYPTION_KEY]
    );

    const { code, expiresAt } = generateVerificationCodeWithExpiry();

    // Use encrypted queries for verification code
    await insertVerificationCode(db, userId, recoveryEmail, null, code, 'email');

    logVerificationCode('email', code);

    return { success: true, codeSent: true };
  } catch (err) {
    console.error('[SECURITY] Error saving recovery email:', err);
    throw err;
  }
}

/**
 * Verify email code
 */
export async function verifyEmailCode(userId, code) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await getVerificationCode(db, userId, code);
    
    if (!result) {
      throw new Error('getVerificationCode returned null or undefined');
    }

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    const { id, email } = result.rows[0];

    await db.query(
      'UPDATE verification_codes SET verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    await db.query(
      `UPDATE security SET recovery_email_verified = TRUE 
       WHERE user_id_hash = $1 AND recovery_email_encrypted = pgp_sym_encrypt($2, $3)`,
      [userIdHash, email || '', process.env.ENCRYPTION_KEY]
    );

    return { success: true, verified: true };
  } catch (err) {
    console.error('[SECURITY] Error verifying email code:', err);
    throw err;
  }
}

/**
 * Remove recovery email
 */
export async function removeRecoveryEmail(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    await db.query(
      `UPDATE security SET recovery_email_encrypted = NULL, recovery_email_verified = FALSE
       WHERE user_id_hash = $1`,
      [userIdHash]
    );

    return { success: true };
  } catch (err) {
    console.error('[SECURITY] Error removing recovery email:', err);
    throw err;
  }
}
