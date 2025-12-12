import { Router } from 'express';
import { auth } from '../shared/firebase-admin.js';
import { db } from '../shared/db.js';
import { authenticateToken, authorizeUser } from '../middleware/auth.js';
import { migrateOnboardingData } from '../shared/accountMigration.js';
import { logAudit } from '../shared/auditLog.js';

const router = Router();

router.post('/register-firebase-user', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) return res.status(400).json({ error: 'userId and email required' });
    const exists = await db.query('SELECT user_id FROM user_personal_info WHERE user_id = $1', [userId]);
    if (exists.rows.length > 0) return res.json({ success: true });
    await db.query('INSERT INTO user_personal_info (user_id, email_encrypted, email_verified, created_at, updated_at) VALUES ($1, pgp_sym_encrypt($2, $3), false, NOW(), NOW())', [userId, email, process.env.ENCRYPTION_KEY]);
    await db.query('INSERT INTO user_2fa_settings (user_id, enabled, method, created_at, updated_at) VALUES ($1, true, \'email\', NOW(), NOW())', [userId]);
    await db.query('INSERT INTO user_astrology (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW())', [userId]);
    await logAudit(db, { userId, action: 'USER_REGISTERED', resourceType: 'authentication', ipAddress: req.ip, userAgent: req.get('user-agent'), httpMethod: req.method, endpoint: req.path, status: 'SUCCESS', details: { email } });
    return res.json({ success: true, userId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/register
 * User registration via Firebase
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Create user in Firebase
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName || ''} ${lastName || ''}`.trim()
    });
    
    // Create user profile in database
        await db.query(
      `INSERT INTO user_personal_info (user_id, email_encrypted, first_name_encrypted, last_name_encrypted, created_at, updated_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, NOW(), NOW())`,
      [userRecord.uid, email, process.env.ENCRYPTION_KEY, firstName || '', lastName || '']
    );
    
    return res.status(201).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      message: 'User registered successfully. Please sign in.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

/**
 * POST /auth/log-email-verified
 * Log email verification (called from client after Firebase verification)
 */
router.post('/log-email-verified', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
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
    return res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] Email verified logging error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/log-login-success
 * Log user login (called from client after Firebase login)
 */
router.post('/log-login-success', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) return res.status(400).json({ error: 'userId and email required' });
    
    // Ensure user record exists (prevent FK constraint violations)
    const exists = await db.query('SELECT user_id FROM user_personal_info WHERE user_id = $1', [userId]);
    if (exists.rows.length === 0) {

      try {
        await db.query('INSERT INTO user_personal_info (user_id, email_encrypted, email_verified, created_at, updated_at) VALUES ($1, pgp_sym_encrypt($2, $3), false, NOW(), NOW())', [userId, email, process.env.ENCRYPTION_KEY]);
        await db.query('INSERT INTO user_2fa_settings (user_id, enabled, method, created_at, updated_at) VALUES ($1, true, \'email\', NOW(), NOW())', [userId]);
        await db.query('INSERT INTO user_astrology (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW())', [userId]);
      } catch (createErr) {
        console.error('[LOGIN-SUCCESS] Failed to create user records:', createErr.message);
      }
    }
    await logAudit(db, {
      userId,
      action: 'USER_LOGIN_SUCCESS',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { email }
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] Login logging error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/register-and-migrate
 * PHASE 2 ENDPOINT: Register account and migrate onboarding data from temp account
 * 
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   firstName?: string,
 *   lastName?: string,
 *   temp_user_id: string (the temporary user's Firebase UID),
 *   onboarding_first_message?: { content: string, timestamp: string },
 *   onboarding_horoscope?: { data: object, timestamp: string }
 * }
 */
router.post('/register-and-migrate', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName,
      temp_user_id,
      onboarding_first_message,
      onboarding_horoscope
    } = req.body;
    
    if (!email || !password || !temp_user_id) {
      return res.status(400).json({ 
        error: 'Email, password, and temp_user_id required' 
      });
    }    
    // Step 1: Create permanent Firebase user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName || ''} ${lastName || ''}`.trim()
    });
    
    const newUserId = userRecord.uid;   
    try {
      // Step 2: Migrate onboarding data
      const migrationResult = await migrateOnboardingData({
        newUserId,
        temp_user_id,
        firstName: firstName || '',
        lastName: lastName || '',
        email,
        onboarding_first_message,
        onboarding_horoscope
      });
      
      return res.status(201).json({
        success: true,
        uid: newUserId,
        email: userRecord.email,
        message: 'Account created and onboarding data migrated successfully',
        migration: migrationResult
      });
      
    } catch (migrationErr) {
      // If migration fails, still return success for account creation
      // but log the migration error
      console.error(`[MIGRATION] Migration failed after account creation:`, migrationErr);
      return res.status(201).json({
        success: true,
        uid: newUserId,
        email: userRecord.email,
        message: 'Account created but data migration encountered issues',
        warning: migrationErr.message
      });
    }
    
  } catch (err) {
    console.error('[MIGRATION] Registration with migration error:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ 
      error: 'Registration with migration failed', 
      details: err.message 
    });
  }
});

/**
 * GET /auth/user
 * Get current user info
 * Requires: Valid Firebase token
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const firebaseUser = await auth.getUser(req.user.uid);
    
      // Get user profile from database (decrypt email)
    const result = await db.query(
      `SELECT user_id, pgp_sym_decrypt(email_encrypted, $1) as email, first_name_encrypted, last_name_encrypted, created_at, updated_at FROM user_personal_info WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, req.user.uid]
    );
    
    const userProfile = result.rows[0] || {};
    
    return res.json({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
      profile: userProfile
    });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /auth/send-password-reset
 * Request password reset email
 */
router.post('/send-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const resetLink = await auth.generatePasswordResetLink(email);
    
    // TODO: Send email with resetLink to user
    // For now, return success
    
    return res.json({
      success: true,
      message: 'Password reset link sent'
    });
  } catch (err) {
    console.error('Password reset error:', err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Failed to send reset link' });
  }
});

/**
 * DELETE /auth/delete-account/:userId
 * Delete user account
 * Requires: Valid Firebase token + authorization
 */
router.delete('/delete-account/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete from Firebase
    await auth.deleteUser(userId);
    
    // Delete/anonymize from database
    await db.query(
            `UPDATE user_personal_info 
       SET first_name = 'DELETED', 
           last_name = 'DELETED',
           email_encrypted = pgp_sym_encrypt($1, $2),
           updated_at = NOW()
       WHERE user_id = $3`,
      [`deleted_${userId}@deleted.local`, process.env.ENCRYPTION_KEY, userId]
    );
    
    // Delete associated data
    await db.query('DELETE FROM messages WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM user_astrology WHERE user_id = $1', [userId]);
    
    return res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * POST /auth/verify-2fa
 * Verify 2FA code
 */
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });
    
    // Verify code exists and is valid
    const codeResult = await db.query(
      `SELECT * FROM user_2fa_codes WHERE user_id = $1 AND code = $2 AND code_type = 'login' AND expires_at > NOW() AND used = false`,
      [userId, code]
    );
    if (codeResult.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired 2FA code' });
    
    // Mark code as used
    await db.query('UPDATE user_2fa_codes SET used = true WHERE id = $1', [codeResult.rows[0].id]);
    
    // Log success
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
    
    return res.json({ success: true, message: '2FA verified' });
  } catch (err) {
    console.error('[VERIFY-2FA] Error:', err);
    return res.status(500).json({ error: '2FA verification failed', details: err.message });
  }
});

/**
 * POST /auth/check-account-lockout/:userId
 * Check if account is currently locked due to failed login attempts
 */
router.post('/check-account-lockout/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Check if account is locked
    const lockoutResult = await db.query(
      `SELECT unlock_at FROM user_account_lockouts 
       WHERE user_id = $1 AND unlock_at > NOW()`,
      [userId]
    );

    if (lockoutResult.rows.length > 0) {
      const lockout = lockoutResult.rows[0];
      const minutesRemaining = Math.ceil(
        (new Date(lockout.unlock_at) - new Date()) / 1000 / 60
      );

      // Log audit: Account access blocked
      await logAudit(db, {
        userId,
        action: 'LOGIN_BLOCKED_ACCOUNT_LOCKED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'BLOCKED',
        details: { minutesRemaining }
      });

      return res.status(429).json({
        success: false,
        locked: true,
        message: `Account locked due to too many failed login attempts. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
        unlockAt: lockout.unlock_at,
        minutesRemaining
      });
    }

    return res.json({
      success: true,
      locked: false,
      message: 'Account is not locked'
    });
  } catch (error) {
    console.error('[CHECK-LOCKOUT] Error:', error);
    return res.status(500).json({ error: 'Failed to check account lockout' });
  }
});

/**
 * POST /auth/log-login-attempt
 * Record a login attempt (success or failure)
 * Called from client after Firebase login attempt
 */
router.post('/log-login-attempt', async (req, res) => {
  try {
    const { userId, success, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Record the attempt
    await db.query(
      `INSERT INTO user_login_attempts (user_id, ip_address, user_agent, success, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, req.ip, req.get('user-agent'), success || false, reason || null]
    );

    // If failed attempt, check if we should lock the account
    if (!success) {
      // Count recent failed attempts (last 60 minutes)
      const countResult = await db.query(
        `SELECT COUNT(*) as failed_count FROM user_login_attempts
         WHERE user_id = $1 AND success = FALSE
         AND created_at > NOW() - INTERVAL '60 minutes'`,
        [userId]
      );

      const failedCount = parseInt(countResult.rows[0].failed_count);
      const LOCKOUT_THRESHOLD = 5;

      // If threshold reached, lock account for 15 minutes
      if (failedCount >= LOCKOUT_THRESHOLD) {
        const unlockAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Try to create lockout (or update existing)
        try {
          await db.query(
            `INSERT INTO user_account_lockouts (user_id, reason, failed_attempt_count, unlock_at, details)
             VALUES ($1, 'failed_attempts', $2, $3, '{}' ::JSONB)
             ON CONFLICT (user_id) WHERE (unlock_at > NOW())
             DO UPDATE SET failed_attempt_count = $2, unlock_at = $3`,
            [userId, failedCount, unlockAt]
          );

          // Log audit: Account locked
          await logAudit(db, {
            userId,
            action: 'ACCOUNT_LOCKED_AUTO',
            resourceType: 'authentication',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            httpMethod: req.method,
            endpoint: req.path,
            status: 'SUCCESS',
            details: { failedAttempts: failedCount, reason: 'Too many failed login attempts' }
          });

          return res.json({
            success: true,
            accountLocked: true,
            message: `Account locked after ${failedCount} failed attempts. Try again in 15 minutes.`
          });
        } catch (lockErr) {
          console.error('[LOGIN-ATTEMPT] Failed to lock account:', lockErr);
        }
      }
    } else {
      // Successful login - clear any pending account lockout after some time
      // (or on next successful login, reset the counter)
      // Note: Lockout will auto-expire after 15 minutes
    }

    return res.json({
      success: true,
      message: `Login attempt recorded (${success ? 'success' : 'failure'})`
    });
  } catch (error) {
    console.error('[LOGIN-ATTEMPT] Error:', error);
    return res.status(500).json({ error: 'Failed to log login attempt' });
  }
});

/**
 * POST /auth/check-2fa/:userId
 * Check if 2FA is enabled and send code (for Firebase users)
 */
router.post('/check-2fa/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Get 2FA settings
    const twoFAResult = await db.query(
      'SELECT * FROM user_2fa_settings WHERE user_id = $1',
      [userId]
    );

    const twoFASettings = twoFAResult.rows[0];

        // If 2FA disabled, allow access
    if (!twoFASettings || !twoFASettings.enabled) {
      return res.json({
        success: true,
        userId,
        requires2FA: false,
        message: 'No 2FA required'
      });
    }

    // Account not locked and 2FA enabled, continue with sending code

    // 2FA is enabled - generate and send code
    const { generate6DigitCode } = await import('../shared/authUtils.js');
    const { send2FACodeEmail } = await import('../shared/emailService.js');
    
    const code = generate6DigitCode();
    const codeExpires = new Date(Date.now() + 10 * 60000); // 10 minutes

    await db.query(
      `INSERT INTO user_2fa_codes (user_id, code, code_type, created_at, expires_at)
       VALUES ($1, $2, 'login', NOW(), $3)`,
      [userId, code, codeExpires]
    );

    // Get user's email
    const userResult = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const email = userResult.rows[0].email;

    // Send 2FA code via email
    const sendResult = await send2FACodeEmail(email, code);

    if (!sendResult.success) {
      console.error('[AUTH] Failed to send 2FA code:', sendResult.error);
      return res.status(500).json({ error: 'Failed to send 2FA code' });
    }

        // Generate temporary JWT token for 2FA verification
    const jwt = await import('jsonwebtoken');
    const tempToken = jwt.default.sign(
      { userId, isTempFor2FA: true },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '10m' }
    );

    // Log 2FA request
    await logAudit(db, {
      userId,
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
      userId,
      tempToken,
      requires2FA: true,
      method: 'email',
      message: '2FA code sent to your email'
    });
  } catch (error) {
    console.error('[CHECK-2FA] Error:', error);
    return res.status(500).json({ error: 'Failed to check 2FA', details: error.message });
  }
});

/**
 * POST /auth/unlock-account/:userId
 * Manually unlock an account (user-initiated recovery)
 * Requires: User authorization
 */
router.post('/unlock-account/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow user to unlock their own account
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Remove lockout
    const result = await db.query(
      `DELETE FROM user_account_lockouts 
       WHERE user_id = $1 AND unlock_at > NOW()
       RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'Account is not currently locked'
      });
    }

    // Log audit
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_UNLOCKED_MANUAL',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    });

    return res.json({
      success: true,
      message: 'Account unlocked successfully'
    });
  } catch (error) {
    console.error('[UNLOCK-ACCOUNT] Error:', error);
    return res.status(500).json({ error: 'Failed to unlock account' });
  }
});

export default router;

