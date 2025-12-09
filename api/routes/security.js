import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../shared/db.js';
import * as securityService from '../services/securityService.js';

const router = express.Router();

// Middleware: Verify token on all routes
router.use(authenticateToken);

/**
 * POST /api/security/track-device/:userId
 * Track a new device login
 */
router.post('/track-device/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { deviceName, ipAddress } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!deviceName || !ipAddress) {
      return res.status(400).json({ error: 'deviceName and ipAddress required' });
    }

    // Get the current device entry
    const userAgent = req.get('user-agent') || 'Unknown';
    const token = req.get('authorization')?.split(' ')[1] || 'unknown';

    const result = await db.query(
      `INSERT INTO security_sessions (user_id, firebase_token, device_name, ip_address, user_agent, last_active, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [userId, token, deviceName, ipAddress, userAgent]
    );

    console.log('[SECURITY] ✓ Device tracked for user:', userId, 'Device:', deviceName);
    res.json({ success: true, device: result.rows[0] });
  } catch (err) {
    console.error('[SECURITY] Error tracking device:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/devices/:userId
 * Get all devices user is logged in from
 */
router.get('/devices/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await securityService.getDevices(userId);
    res.json(result);
  } catch (err) {
    console.error('[SECURITY] Error in GET /devices:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/security/devices/:userId/:deviceId
 * Log out a specific device
 */
router.delete('/devices/:userId/:deviceId', async (req, res) => {
  try {
    const { userId, deviceId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await securityService.logoutDevice(userId, deviceId);
    res.json(result);
  } catch (err) {
    console.error('[SECURITY] Error in DELETE /devices:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/phone/:userId
 * Get phone data
 */
router.get('/phone/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const data = await securityService.getPhoneData(userId);
    res.json(data);
  } catch (err) {
    console.error('[SECURITY] Error in GET /phone:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/phone/:userId
 * Save phone number and send verification code
 */
router.post('/phone/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { phoneNumber, recoveryPhone } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const result = await securityService.savePhoneNumber(userId, phoneNumber, recoveryPhone);
    res.json(result);
  } catch (err) {
    console.error('[SECURITY] Error in POST /phone:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/phone/:userId/verify
 * Verify phone code
 */
router.post('/phone/:userId/verify', async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const result = await securityService.verifyPhoneCode(userId, code);
    res.json(result);
  } catch (err) {
    console.error('[SECURITY] Error in POST /phone/verify:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/security/email/:userId
 * Get email data
 */
router.get('/email/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const data = await securityService.getEmailData(userId);
    res.json(data);
  } catch (err) {
    console.error('[SECURITY] Error in GET /email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/email/:userId
 * Save recovery email and send verification code
 */
router.post('/email/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { recoveryEmail } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!recoveryEmail || typeof recoveryEmail !== 'string') {
      return res.status(400).json({ error: 'Recovery email is required' });
    }

    const result = await securityService.saveRecoveryEmail(userId, recoveryEmail);
    res.json(result);
  } catch (err) {
    console.error('[SECURITY] Error in POST /email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/email/:userId/verify
 * Verify email code
 */
router.post('/email/:userId/verify', async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const result = await securityService.verifyEmailCode(userId, code);
    res.json(result);
  } catch (err) {
    console.error('[SECURITY] Error in POST /email/verify:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/security/email/:userId
 * Remove recovery email
 */
router.delete('/email/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await securityService.removeRecoveryEmail(userId);
    res.json(result);
  } catch (err) {
    console.error('[SECURITY] Error in DELETE /email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/password-changed/:userId
 * Record password change and log out other sessions
 */
router.post('/password-changed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await securityService.recordPasswordChange(userId);
    res.json(result);
  } catch (err) {
    console.error('[SECURITY] Error in POST /password-changed:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/2fa-settings/:userId
 * Get 2FA and session settings
 */
router.get('/2fa-settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const settings = await securityService.get2FASettings(userId);
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[SECURITY] Error in GET /2fa-settings:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/2fa-settings/:userId
 * Update 2FA settings (enabled, method)
 */
router.post('/2fa-settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled, method } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be boolean' });
    }

    if (!method || !['sms', 'email'].includes(method)) {
      return res.status(400).json({ error: 'method must be sms or email' });
    }

    const settings = await securityService.update2FASettings(userId, { enabled, method });

    console.log('[SECURITY] ✓ 2FA settings updated for user:', userId);
    res.json({ 
      success: true, 
      settings,
      message: enabled ? '2FA enabled' : '2FA disabled'
    });
  } catch (err) {
    console.error('[SECURITY] Error in POST /2fa-settings:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/session-preference/:userId
 * Update "Stay Logged In" preference
 */
router.post('/session-preference/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { persistentSession } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (typeof persistentSession !== 'boolean') {
      return res.status(400).json({ error: 'persistentSession must be boolean' });
    }

    const result = await securityService.updateSessionPreference(userId, persistentSession);

    console.log('[SECURITY] ✓ Session preference updated for user:', userId);
    res.json({ 
      success: true, 
      persistentSession: result.persistent_session,
      message: persistentSession 
        ? 'You will stay logged in for 30 days' 
        : 'You will log out when closing the browser'
    });
  } catch (err) {
    console.error('[SECURITY] Error in POST /session-preference:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/verification-methods/:userId
 * Get combined verification methods (phone + email from both tables)
 */
router.get('/verification-methods/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get user email from database
    const userResult = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );
    
    const userEmail = userResult.rows[0]?.email || '';
    const methods = await securityService.getVerificationMethods(userId, userEmail);
    res.json({ success: true, methods });
  } catch (err) {
    console.error('[SECURITY] Error in GET /verification-methods:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
