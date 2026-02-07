import { db } from '../shared/db.js';
import { hashPassword, comparePassword, generate6DigitCode } from '../shared/authUtils.js';
import { sendEmailVerification } from '../shared/emailService.js';
import { v4 as uuidv4 } from 'uuid';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * Find user by email (decrypted)
 */
export async function getUserByEmail(email) {
  try {
    const result = await db.query(
      `SELECT user_id, password_hash, email_verified FROM user_personal_info 
       WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
      [process.env.ENCRYPTION_KEY, email]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'auth service');
    return null;
  }
}

/**
 * Get user's email (decrypted)
 */
export async function getUserEmail(userId) {
  try {
    const result = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );

    return result.rows.length > 0 ? result.rows[0].email : null;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'auth service');
    return null;
  }
}

/**
 * Create user with email and password
 */
export async function createUserWithEmail(email, password, phoneNumber) {
  const userId = uuidv4();
  const passwordHash = await hashPassword(password);

  try {
    await db.query('BEGIN');

    // Create user record
    await db.query(
      `INSERT INTO user_personal_info (user_id, email_encrypted, password_hash, email_verified, email_verified_at, created_at, updated_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, true, NOW(), NOW(), NOW())`,
      [userId, email, process.env.ENCRYPTION_KEY, passwordHash]
    );

    // Create 2FA settings (default: enabled with email)
    await db.query(
      `INSERT INTO user_2fa_settings (user_id, enabled, method, created_at, updated_at)
       VALUES ($1, true, 'email', NOW(), NOW())`,
      [userId]
    );

    // Create astrology record
    await db.query(
      `INSERT INTO user_astrology (user_id, created_at, updated_at)
       VALUES ($1, NOW(), NOW())`,
      [userId]
    );

    await db.query('COMMIT');

    return { success: true, userId };
  } catch (error) {
    await db.query('ROLLBACK');
    logErrorFromCatch(error, 'app', 'auth service');
    return { success: false, error: error.message };
  }
}

/**
 * Create Firebase user record in database
 */
export async function createFirebaseUser(userId, email) {
  try {
    // Check if user already exists
    const existing = await db.query(
      'SELECT user_id FROM user_personal_info WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return { success: true, message: 'User already exists' };
    }

    await db.query('BEGIN');

    // Create user record
    await db.query(
      `INSERT INTO user_personal_info (user_id, email_encrypted, email_verified, created_at, updated_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), false, NOW(), NOW())`,
      [userId, email, process.env.ENCRYPTION_KEY]
    );

    // Create 2FA settings (default: enabled with email)
    await db.query(
      `INSERT INTO user_2fa_settings (user_id, enabled, method, created_at, updated_at)
       VALUES ($1, true, 'email', NOW(), NOW())`,
      [userId]
    );

    // Create astrology record
    await db.query(
      `INSERT INTO user_astrology (user_id, created_at, updated_at)
       VALUES ($1, NOW(), NOW())`,
      [userId]
    );

    await db.query('COMMIT');

    return { success: true, userId };
  } catch (error) {
    await db.query('ROLLBACK');
    logErrorFromCatch(error, 'app', 'auth service');
    return { success: false, error: error.message };
  }
}

/**
 * Check if email already exists
 */
export async function emailExists(email) {
  try {
    const result = await db.query(
      `SELECT user_id FROM user_personal_info WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
      [process.env.ENCRYPTION_KEY, email]
    );

    return result.rows.length > 0;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'auth service');
    return false;
  }
}

/**
 * Verify password
 */
export async function verifyPassword(password, passwordHash) {
  try {
    return await comparePassword(password, passwordHash);
  } catch (error) {
    logErrorFromCatch(error, 'app', 'auth service');
    return false;
  }
}

/**
 * Mark email as verified
 */
export async function markEmailVerified(userId) {
  try {
    await db.query(
      `UPDATE user_personal_info 
       SET email_verified = true, email_verified_at = NOW(), updated_at = NOW() 
       WHERE user_id = $1`,
      [userId]
    );

    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'auth service');
    return { success: false, error: error.message };
  }
}

/**
 * Reset password
 */
export async function resetPassword(userId, newPassword) {
  try {
    const passwordHash = await hashPassword(newPassword);

    await db.query(
      `UPDATE user_personal_info 
       SET password_hash = $1, updated_at = NOW() 
       WHERE user_id = $2`,
      [passwordHash, userId]
    );

    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'auth service');
    return { success: false, error: error.message };
  }
}

/**
 * Send email verification code
 */
export async function sendVerificationEmail(userId, email) {
  try {
    const code = generate6DigitCode();
    const codeExpires = new Date(Date.now() + 10 * 60000); // 10 minutes

    await db.query(
      `INSERT INTO user_2fa_codes (user_id, code, code_type, created_at, expires_at)
       VALUES ($1, $2, 'email_verification', NOW(), $3)`,
      [userId, code, codeExpires]
    );

    const result = await sendEmailVerification(email, code);

    if (!result.success) {
      return { success: false, error: 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'auth service');
    return { success: false, error: error.message };
  }
}
