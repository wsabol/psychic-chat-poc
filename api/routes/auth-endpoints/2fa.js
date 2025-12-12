import { Router } from 'express';
import logger from '../../shared/logger.js';
import { db } from '../../shared/db.js';
import { authenticateToken } from '../../middleware/auth.js';
import { logAudit } from '../../shared/auditLog.js';
import { isAccountLocked } from './helpers/accountLockout.js';

const router = Router();

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
    logger.error('2FA verification error:', err.message);
    return res.status(500).json({ error: '2FA verification failed', details: err.message });
  }
});

/**
 * POST /auth/check-2fa/:userId
 * Check if 2FA is enabled and send code
 */
router.post('/check-2fa/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Check if account is locked
    const lockStatus = await isAccountLocked(userId);
    if (lockStatus.locked) {
      await logAudit(db, {
        userId,
        action: 'LOGIN_BLOCKED_ACCOUNT_LOCKED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'BLOCKED',
        details: { minutesRemaining: lockStatus.minutesRemaining }
      });

      return res.status(429).json({
        success: false,
        locked: true,
        message: `Account locked. Try again in ${lockStatus.minutesRemaining} minute${lockStatus.minutesRemaining !== 1 ? 's' : ''}.`,
        unlockAt: lockStatus.unlockAt,
        minutesRemaining: lockStatus.minutesRemaining
      });
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

    // Generate and send 2FA code
    const { generate6DigitCode } = await import('../../shared/authUtils.js');
    const { send2FACodeEmail } = await import('../../shared/emailService.js');
    
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
      logger.error('Failed to send 2FA code:', sendResult.error);
      return res.status(500).json({ error: 'Failed to send 2FA code' });
    }

    // Generate temporary JWT token
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
    logger.error('2FA check error:', error.message);
    return res.status(500).json({ error: 'Failed to check 2FA', details: error.message });
  }
});

export default router;
