import { Router } from 'express';
import logger from '../../shared/logger.js';
import { auth } from '../../shared/firebase-admin.js';
import { db } from '../../shared/db.js';
import { authenticateToken, authorizeUser } from '../../middleware/auth.js';
import { logAudit } from '../../shared/auditLog.js';
import { getUserProfile, anonymizeUser } from './helpers/userCreation.js';
import { unlockAccount } from './helpers/accountLockout.js';

const router = Router();

/**
 * GET /auth/user
 * Get current user info
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const firebaseUser = await auth.getUser(req.user.uid);
    const userProfile = await getUserProfile(req.user.uid);
    
    return res.json({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
      profile: userProfile
    });
  } catch (err) {
    logger.error('Get user error:', err.message);
    return res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /auth/log-email-verified
 * Log email verification
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
    logger.error('Email verified logging error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /auth/delete-account/:userId
 * Delete user account
 */
router.delete('/delete-account/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete from Firebase
    await auth.deleteUser(userId);
    
    // Anonymize database
    await anonymizeUser(userId);

    await logAudit(db, {
      userId,
      action: 'USER_ACCOUNT_DELETED',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    });
    
    return res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (err) {
    logger.error('Delete account error:', err.message);
    return res.status(500).json({ error: 'Failed to delete account' });
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
    logger.error('Password reset error:', err.message);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Failed to send reset link' });
  }
});

/**
 * POST /auth/unlock-account/:userId
 * Manually unlock an account (user-initiated recovery)
 */
router.post('/unlock-account/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow user to unlock their own account
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await unlockAccount(userId, req);
    return res.json(result);
  } catch (error) {
    logger.error('Account unlock error:', error.message);
    return res.status(500).json({ error: 'Failed to unlock account' });
  }
});

export default router;
