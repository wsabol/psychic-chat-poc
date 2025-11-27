import { Router } from 'express';
import { auth } from '../shared/firebase-admin.js';
import { db } from '../shared/db.js';
import { authenticateToken, authorizeUser } from '../middleware/auth.js';

const router = Router();

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
      `INSERT INTO user_personal_info (user_id, email, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [userRecord.uid, email, firstName || '', lastName || '']
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
 * GET /auth/user
 * Get current user info
 * Requires: Valid Firebase token
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const firebaseUser = await auth.getUser(req.user.uid);
    
    // Get user profile from database
    const result = await db.query(
      'SELECT * FROM user_personal_info WHERE user_id = $1',
      [req.user.uid]
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
           email = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [`deleted_${userId}@deleted.local`, userId]
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

export default router;