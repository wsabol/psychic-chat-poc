import { db } from '../../shared/db.js';
import { encryptEmail, decryptEmail, generateVerificationCodeWithExpiry, logVerificationCode } from './helpers/securityHelpers.js';

/**
 * Get email data
 */
export async function getEmailData(userId) {
  try {
    const result = await db.query(
      'SELECT recovery_email, recovery_email_verified FROM security WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { recoveryEmail: null, recoveryEmailVerified: false };
    }

    const row = result.rows[0];
    return {
      recoveryEmail: decryptEmail(row.recovery_email),
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
    const encryptedEmail = encryptEmail(recoveryEmail);

    await db.query(
      `INSERT INTO security (user_id, recovery_email, recovery_email_verified)
       VALUES ($1, $2, FALSE)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         recovery_email = $2,
         recovery_email_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, encryptedEmail]
    );

    const { code, expiresAt } = generateVerificationCodeWithExpiry();

    await db.query(
      `INSERT INTO verification_codes (user_id, email, code, code_type, expires_at)
       VALUES ($1, $2, $3, 'email', $4)`,
      [userId, recoveryEmail, code, expiresAt]
    );

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
    const result = await db.query(
      `SELECT id, email FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND code_type = 'email' 
       AND expires_at > NOW() AND verified_at IS NULL`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    const { id, email } = result.rows[0];

    await db.query(
      'UPDATE verification_codes SET verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    const encryptedEmail = encryptEmail(email);
    await db.query(
      `UPDATE security SET recovery_email_verified = TRUE 
       WHERE user_id = $1 AND recovery_email = $2`,
      [userId, encryptedEmail]
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
    await db.query(
      `UPDATE security SET recovery_email = NULL, recovery_email_verified = FALSE
       WHERE user_id = $1`,
      [userId]
    );

    return { success: true };
  } catch (err) {
    console.error('[SECURITY] Error removing recovery email:', err);
    throw err;
  }
}
