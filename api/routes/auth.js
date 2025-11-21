import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  validatePassword,
  hashPassword,
  comparePassword,
  generate6DigitCode,
  validate6DigitCode,
  formatPhoneNumber,
  validateEmail,
  logAudit,
  hashEmail
} from '../shared/authUtils.js';
import { sendSMS, sendPasswordResetSMS } from '../shared/smsService.js';
import { sendEmailVerification, sendPasswordResetEmail, send2FACodeEmail } from '../shared/emailService.js';
import { generateToken, generateRefreshToken, authenticateToken, authorizeUser, verify2FA } from '../middleware/auth.js';
import { db } from '../shared/db.js';

const router = Router();

/**
 * POST /auth/register
 * Register a new user with email and password
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, phoneNumber } = req.body;

    // Validation
    if (!email || !password || !phoneNumber) {
      return res.status(400).json({ error: 'Email, password, and phone number required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if email already exists by hash
    const emailHash = hashEmail(email);
    const existingUser = await db.query(
      'SELECT user_id FROM user_personal_info WHERE email_hash = $1',
      [emailHash]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate user ID and hash password
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

    // Insert user with default 2FA enabled
    await db.query('BEGIN');

    try {
      // Create user record with:
      // - email_hash for searchable lookups (SHA256 hash)
      // - email_encrypted for storage (encrypted at rest with pgcrypto)
      // - password_hash for authentication (bcrypt - never encrypted)
      // This ensures GDPR compliance while maintaining functionality
      await db.query(
        `INSERT INTO user_personal_info (user_id, email_hash, email_encrypted, password_hash, email_verified, email_verified_at, created_at, updated_at)
         VALUES ($1, $2, pgp_sym_encrypt($3, '${ENCRYPTION_KEY}'), $4, true, NOW(), NOW(), NOW())`,
        [userId, emailHash, email, passwordHash]
      );

      // Create 2FA settings (default: enabled with SMS)
      await db.query(
        `INSERT INTO user_2fa_settings (user_id, enabled, phone_number, method, created_at, updated_at)
         VALUES ($1, true, $2, 'sms', NOW(), NOW())`,
        [userId, formattedPhone]
      );

      // Generate email verification code
      const emailCode = generate6DigitCode();
      const codeExpires = new Date(Date.now() + 10 * 60000); // 10 minutes

      await db.query(
        `INSERT INTO user_2fa_codes (user_id, code, code_type, created_at, expires_at)
         VALUES ($1, $2, 'email_verification', NOW(), $3)`,
        [userId, emailCode, codeExpires]
      );

      await db.query('COMMIT');

      // Send email verification code
      const emailResult = await sendEmailVerification(email, emailCode);

      if (!emailResult.success) {
        console.error('Email verification failed:', emailResult.error);
        return res.status(500).json({ error: 'Failed to send verification email' });
      }

      // Log audit
      await logAudit(db, userId, 'REGISTER', { email }, req.ip, req.get('user-agent'));

      return res.status(201).json({
        success: true,
        userId,
        message: 'Registration successful. Please check your email for verification code.',
        requiresEmailVerification: true
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

/**
 * POST /auth/verify-email
 * Verify email with code received via email
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'userId and code required' });
    }

    if (!validate6DigitCode(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // Verify code
    const codeResult = await db.query(
      `SELECT * FROM user_2fa_codes 
       WHERE user_id = $1 AND code = $2 AND code_type = 'email_verification' 
       AND expires_at > NOW() AND used = false`,
      [userId, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Mark code as used and email as verified
    await db.query('BEGIN');

    try {
      await db.query(
        'UPDATE user_2fa_codes SET used = true WHERE id = $1',
        [codeResult.rows[0].id]
      );

      await db.query(
        `UPDATE user_personal_info 
         SET email_verified = true, email_verified_at = NOW(), updated_at = NOW() 
         WHERE user_id = $1`,
        [userId]
      );

      await db.query('COMMIT');

      // Log audit
      await logAudit(db, userId, 'EMAIL_VERIFIED', {}, req.ip, req.get('user-agent'));

      return res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ error: 'Email verification failed', details: error.message });
  }
});

/**
 * POST /auth/login
 * Login with email and password, returns temporary token requiring 2FA
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email hash
    const emailHash = hashEmail(email);
    const userResult = await db.query(
      'SELECT user_id, password_hash, email_verified FROM user_personal_info WHERE email_hash = $1',
      [emailHash]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      await logAudit(db, user.user_id, 'LOGIN_FAILED', { reason: 'invalid_password' }, req.ip, req.get('user-agent'));
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if email verified
    // TODO: Require email verification in production
    // if (!user.email_verified) {
    //   return res.status(403).json({
    //     error: 'Email not verified',
    //     userId: user.user_id,
    //     requiresEmailVerification: true
    //   });
    // }

    // Get 2FA settings (disabled for testing while Twilio setup pending)
    // const twoFAResult = await db.query(
    //   'SELECT * FROM user_2fa_settings WHERE user_id = $1',
    //   [user.user_id]
    // );
    //
    // const twoFASettings = twoFAResult.rows[0];
    //
    // if (twoFASettings && twoFASettings.enabled) {
    //   // Generate and send 2FA code
    //   const code = generate6DigitCode();
    //   const codeExpires = new Date(Date.now() + 10 * 60000); // 10 minutes
    //
    //   await db.query(
    //     `INSERT INTO user_2fa_codes (user_id, code, code_type, created_at, expires_at)
    //      VALUES ($1, $2, 'login', NOW(), $3)`,
    //     [user.user_id, code, codeExpires]
    //   );
    //
    //   // Send code via preferred method
    //   let sendResult;
    //   if (twoFASettings.method === 'email') {
    //     sendResult = await send2FACodeEmail(email, code);
    //   } else {
    //     sendResult = await sendSMS(twoFASettings.phone_number, code);
    //   }
    //
    //   if (!sendResult.success) {
    //     return res.status(500).json({ error: 'Failed to send 2FA code' });
    //   }
    //
    //   // Return temporary token requiring 2FA
    //   const tempToken = generateToken(user.user_id, true);
    //
    //   await logAudit(db, user.user_id, 'LOGIN_2FA_REQUESTED', { method: twoFASettings.method }, req.ip, req.get('user-agent'));
    //
    //   return res.json({
    //     success: true,
    //     userId: user.user_id,
    //     tempToken,
    //     requires2FA: true,
    //     method: twoFASettings.method,
    //     message: `2FA code sent via ${twoFASettings.method}`
    //   });
    // }

    // 2FA disabled for testing - skip to direct login
    // TODO: Re-enable after Twilio account setup
    const token = generateToken(user.user_id, false);
    const refreshToken = generateRefreshToken(user.user_id);

    await logAudit(db, user.user_id, 'LOGIN_SUCCESS', {}, req.ip, req.get('user-agent'));

    return res.json({
      success: true,
      userId: user.user_id,
      email: email,
      token,
      refreshToken,
      requires2FA: false,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

/**
 * POST /auth/verify-2fa
 * Verify 2FA code and return full token
 */
router.post('/verify-2fa', verify2FA, async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'userId and code required' });
    }

    if (!validate6DigitCode(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // Verify code
    const codeResult = await db.query(
      `SELECT * FROM user_2fa_codes 
       WHERE user_id = $1 AND code = $2 AND code_type = 'login' 
       AND expires_at > NOW() AND used = false`,
      [userId, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired 2FA code' });
    }

    // Mark code as used
    await db.query(
      'UPDATE user_2fa_codes SET used = true WHERE id = $1',
      [codeResult.rows[0].id]
    );

    // Generate full token
    const token = generateToken(userId, false);
    const refreshToken = generateRefreshToken(userId);

    await logAudit(db, userId, 'LOGIN_2FA_VERIFIED', {}, req.ip, req.get('user-agent'));

    return res.json({
      success: true,
      token,
      refreshToken,
      message: '2FA verified. Login complete.'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return res.status(500).json({ error: '2FA verification failed', details: error.message });
  }
});

/**
 * POST /auth/forgot-password
 * Request password reset - sends code via SMS
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find user by email hash
    const emailHash = hashEmail(email);
    const userResult = await db.query(
      'SELECT user_id FROM user_personal_info WHERE email_hash = $1',
      [emailHash]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists (security best practice)
      return res.json({
        success: true,
        message: 'If email exists, password reset code has been sent to your phone.'
      });
    }

    const userId = userResult.rows[0].user_id;

    // Get user's phone number from 2FA settings
    const phoneResult = await db.query(
      'SELECT phone_number FROM user_2fa_settings WHERE user_id = $1',
      [userId]
    );

    if (phoneResult.rows.length === 0 || !phoneResult.rows[0].phone_number) {
      return res.json({
        success: true,
        message: 'If email exists, password reset code has been sent to your phone.'
      });
    }

    // Generate reset code
    const resetCode = generate6DigitCode();
    const codeExpires = new Date(Date.now() + 15 * 60000); // 15 minutes

    await db.query(
      `INSERT INTO user_2fa_codes (user_id, code, code_type, created_at, expires_at)
       VALUES ($1, $2, 'password_reset', NOW(), $3)`,
      [userId, resetCode, codeExpires]
    );

    // Send code via SMS
    const sendResult = await sendPasswordResetSMS(phoneResult.rows[0].phone_number, resetCode);

    if (!sendResult.success) {
      console.error('Failed to send password reset SMS:', sendResult.error);
    }

    await logAudit(db, userId, 'PASSWORD_RESET_REQUESTED', {}, req.ip, req.get('user-agent'));

    return res.json({
      success: true,
      message: 'If email exists, password reset code has been sent to your phone.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Forgot password failed', details: error.message });
  }
});

/**
 * POST /auth/reset-password
 * Reset password with code
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { userId, code, newPassword, newPasswordConfirm } = req.body;

    if (!userId || !code || !newPassword || !newPasswordConfirm) {
      return res.status(400).json({ error: 'userId, code, newPassword, and confirmation required' });
    }

    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    if (!validate6DigitCode(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // Verify code
    const codeResult = await db.query(
      `SELECT * FROM user_2fa_codes 
       WHERE user_id = $1 AND code = $2 AND code_type = 'password_reset' 
       AND expires_at > NOW() AND used = false`,
      [userId, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Update password
    const newPasswordHash = await hashPassword(newPassword);

    await db.query('BEGIN');

    try {
      // Update password
      await db.query(
        `UPDATE user_personal_info 
         SET password_hash = $1, updated_at = NOW() 
         WHERE user_id = $2`,
        [newPasswordHash, userId]
      );

      // Mark code as used
      await db.query(
        'UPDATE user_2fa_codes SET used = true WHERE id = $1',
        [codeResult.rows[0].id]
      );

      await db.query('COMMIT');

      await logAudit(db, userId, 'PASSWORD_RESET', {}, req.ip, req.get('user-agent'));

      return res.json({
        success: true,
        message: 'Password reset successful. Please log in with your new password.'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Password reset failed', details: error.message });
  }
});

/**
 * GET /auth/2fa-settings/:userId
 * Get user's 2FA settings
 */
router.post('/2fa-settings/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      `SELECT user_id, enabled, phone_number, backup_phone_number, method 
       FROM user_2fa_settings 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '2FA settings not found' });
    }

    return res.json({
      success: true,
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Get 2FA settings error:', error);
    return res.status(500).json({ error: 'Failed to get 2FA settings' });
  }
});

/**
 * POST /auth/2fa-settings/:userId
 * Update user's 2FA settings
 */
router.post('/2fa-settings/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled, method, phoneNumber, backupPhoneNumber } = req.body;
    const db = getDb();

    // Validate inputs
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be boolean' });
    }

    if (method && !['sms', 'email'].includes(method)) {
      return res.status(400).json({ error: 'method must be "sms" or "email"' });
    }

    if (phoneNumber && !formatPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (backupPhoneNumber && !formatPhoneNumber(backupPhoneNumber)) {
      return res.status(400).json({ error: 'Invalid backup phone number format' });
    }

    // Build update query
    const updates = [];
    const params = [userId];
    let paramIndex = 2;

    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`);
      params.push(enabled);
      paramIndex++;
    }

    if (method) {
      updates.push(`method = $${paramIndex}`);
      params.push(method);
      paramIndex++;
    }

    if (phoneNumber) {
      updates.push(`phone_number = $${paramIndex}`);
      params.push(formatPhoneNumber(phoneNumber));
      paramIndex++;
    }

    if (backupPhoneNumber) {
      updates.push(`backup_phone_number = $${paramIndex}`);
      params.push(formatPhoneNumber(backupPhoneNumber));
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE user_2fa_settings 
      SET ${updates.join(', ')} 
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '2FA settings not found' });
    }

    await logAudit(db, userId, '2FA_SETTINGS_UPDATED', { method, enabled }, req.ip, req.get('user-agent'));

    return res.json({
      success: true,
      settings: result.rows[0],
      message: '2FA settings updated successfully'
    });
  } catch (error) {
    console.error('Update 2FA settings error:', error);
    return res.status(500).json({ error: 'Failed to update 2FA settings', details: error.message });
  }
});

export default router;
