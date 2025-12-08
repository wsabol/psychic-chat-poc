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

export default router;
