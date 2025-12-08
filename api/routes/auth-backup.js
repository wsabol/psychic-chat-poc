import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  validatePassword,
  hashPassword,
  comparePassword,
  generate6DigitCode,
  validate6DigitCode,
  formatPhoneNumber,
  validateEmail
} from '../shared/authUtils.js';
import { logAudit } from '../shared/auditLog.js';
import { sendSMS, sendPasswordResetSMS } from '../shared/smsService.js';
import { sendEmailVerification, sendPasswordResetEmail, send2FACodeEmail } from '../shared/emailService.js';
import { generateToken, generateRefreshToken, authenticateToken, authorizeUser, verify2FA } from '../middleware/auth.js';
import { db } from '../shared/db.js';

const router = Router();

/**
 * POST /auth/register-firebase-user
 * Create database user record for Firebase-authenticated user
 * Called after Firebase registration to sync user to database
 */
router.post('/register-firebase-user', async (req, res) => {
  try {
    console.log('[AUTH-DB] /register-firebase-user endpoint called');
    const { userId, email } = req.body;
    console.log('[AUTH-DB] Received userId:', userId, 'email:', email);

    if (!userId || !email) {
      console.error('[AUTH-DB] Missing userId or email');
      return res.status(400).json({ error: 'userId and email required' });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT user_id FROM user_personal_info WHERE user_id = $1',
      [userId]
    );

    if (existingUser.rows.length > 0) {
      console.log('[AUTH-DB] User already exists:', userId);
      return res.json({ success: true, message: 'User already exists' });
    }

        // Create user record in database - encrypt email
    await db.query(
      `INSERT INTO user_personal_info (user_id, email_encrypted, email_verified, created_at, updated_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), false, NOW(), NOW())`,
      [userId, email, process.env.ENCRYPTION_KEY]
    );

        // Create 2FA settings
    await db.query(
      `INSERT INTO user_2fa_settings (user_id, enabled, method, created_at, updated_at)
       VALUES ($1, true, 'email', NOW(), NOW())`,
      [userId]
    );

    // Create astrology record (needed for horoscope/cosmic weather requests)
    await db.query(
      `INSERT INTO user_astrology (user_id, created_at, updated_at)
       VALUES ($1, NOW(), NOW())`,
      [userId]
    );

    console.log('[AUTH-DB] ✓ Database user record created for:', userId, email);

    return res.json({
      success: true,
      message: 'User database record created',
      userId
    });
  } catch (error) {
    console.error('[AUTH-DB] Error creating database user record:', error);
    return res.status(500).json({ error: 'Failed to create user database record', details: error.message });
  }
});

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

        // Check if email already exists - decrypt to compare
    const existingUser = await db.query(
      `SELECT user_id FROM user_personal_info WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
      [process.env.ENCRYPTION_KEY, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate user ID and hash password
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    // Insert user with default 2FA enabled
    await db.query('BEGIN');

    try {
            // Create user record with auto-verified email (for testing - remove in production)
      // Encrypt email before storing
      await db.query(
        `INSERT INTO user_personal_info (user_id, email_encrypted, password_hash, email_verified, email_verified_at, created_at, updated_at)
         VALUES ($1, pgp_sym_encrypt($2, $3), $4, true, NOW(), NOW(), NOW())`,
        [userId, email, process.env.ENCRYPTION_KEY, passwordHash]
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
      await logAudit(db, {
        userId,
        action: 'USER_REGISTERED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS',
        details: { email }
      });

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
      await logAudit(db, {
        userId,
        action: 'USER_EMAIL_VERIFIED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS'
      });

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

        // Find user by email - decrypt to compare
    const userResult = await db.query(
      `SELECT user_id, password_hash, email_verified FROM user_personal_info WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
      [process.env.ENCRYPTION_KEY, email]
    );

        if (userResult.rows.length === 0) {
      // Log failed login attempt (without user_id since user doesn't exist)
      await logAudit(db, {
        action: 'USER_LOGIN_FAILED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'FAILURE',
        errorCode: 'USER_NOT_FOUND',
        details: { email }
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      // Log failed login attempt
      await logAudit(db, {
        userId: user.user_id,
        action: 'USER_LOGIN_FAILED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'FAILURE',
        errorCode: 'INVALID_PASSWORD',
        details: { email }
      });
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

            // Get 2FA settings - ENABLED with SendGrid email
    const twoFAResult = await db.query(
      'SELECT * FROM user_2fa_settings WHERE user_id = $1',
            [user.user_id]
    );

    const twoFASettings = twoFAResult.rows[0];

    if (twoFASettings && twoFASettings.enabled) {
      // Generate and send 2FA code via email
      const code = generate6DigitCode();
      const codeExpires = new Date(Date.now() + 10 * 60000); // 10 minutes
    //
          await db.query(
        `INSERT INTO user_2fa_codes (user_id, code, code_type, created_at, expires_at)
         VALUES ($1, $2, 'login', NOW(), $3)`,
        [user.user_id, code, codeExpires]
      );
    //
          // Send 2FA code via email (SendGrid)
      const sendResult = await send2FACodeEmail(email, code);
    //
          if (!sendResult.success) {
        console.error('[AUTH] Failed to send 2FA code:', sendResult.error);
        return res.status(500).json({ error: 'Failed to send 2FA code', details: sendResult.error });
      }
    //
          // Return temporary token requiring 2FA
      const tempToken = generateToken(user.user_id, true);

      // Log 2FA request
      await logAudit(db, {
        userId: user.user_id,
        action: 'LOGIN_2FA_REQUESTED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS',
        details: { method: 'email', email }
      });

      return res.json({
        success: true,
        userId: user.user_id,
        tempToken,
        requires2FA: true,
        method: 'email',
        message: '2FA code sent to your email. Check your inbox and verify within 10 minutes.'
      });
    }

                // 2FA disabled or not configured - skip to direct login
    const token = generateToken(user.user_id, false);
    const refreshToken = generateRefreshToken(user.user_id);

    // Log successful login
    await logAudit(db, {
      userId: user.user_id,
      action: 'USER_LOGIN_SUCCESS',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { email }
    });

        return res.json({
      success: true,
      userId: user.user_id,
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

    // Log 2FA verification
    await logAudit(db, {
      userId,
      action: 'USER_2FA_VERIFIED',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    });

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

        // Find user by email - decrypt to compare
    const userResult = await db.query(
      `SELECT user_id FROM user_personal_info WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
      [process.env.ENCRYPTION_KEY, email]
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

    // Log password reset request
    await logAudit(db, {
      userId,
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { email }
    });

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

      // Log password reset completion
      await logAudit(db, {
        userId,
        action: 'PASSWORD_RESET_COMPLETED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS'
      });

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
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

        // Verify refresh token
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production');
      
      // Generate new access token
      const newToken = generateToken(decoded.userId, false);
      
      return res.json({
        success: true,
        token: newToken,
        expiresIn: '15m',
        message: 'Token refreshed successfully'
      });
        } catch (err) {
      // Log failed token refresh
      await logAudit(db, {
        action: 'TOKEN_REFRESH_FAILED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'FAILURE',
        errorCode: 'INVALID_REFRESH_TOKEN'
      });
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Token refresh failed', details: error.message });
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

    // Log 2FA settings change
    await logAudit(db, {
      userId,
      action: '2FA_SETTINGS_UPDATED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { method, enabled }
    });

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
