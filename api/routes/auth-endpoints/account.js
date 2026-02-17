import { Router } from 'express';
import logger from '../../shared/logger.js';
import { auth } from '../../shared/firebase-admin.js';
import { db } from '../../shared/db.js';
import { migrateOnboardingData } from '../../shared/accountMigration.js';
import { logAudit } from '../../shared/auditLog.js';
import { createUserDatabaseRecords } from './helpers/userCreation.js';
import { validationError, serverError, createdResponse, successResponse } from '../../utils/responses.js';

const router = Router();

/**
 * POST /auth/register
 * User registration via Firebase
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password) {
      return validationError(res, 'Email and password are required');
    }
    
    // Check if admin email
    const ADMIN_EMAILS = ['starshiptechnology1@gmail.com', 'wsabol39@gmail.com'];
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
    
    // Create user in Firebase
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName || ''} ${lastName || ''}`.trim()
    });
    
    // Create user profile in database with admin flag
    await createUserDatabaseRecords(userRecord.uid, email, firstName, lastName, isAdminEmail);

    // Log registration
    await logAudit(db, {
      userId: userRecord.uid,
      action: 'USER_REGISTERED',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { email }
    });
    
        return createdResponse(res, {
      success: true,
      message: 'User registered successfully. Please sign in.'
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return validationError(res, 'Email address already registered');
    }
    return serverError(res, 'Failed to register user');
  }
});

/**
 * POST /auth/register-firebase-user
 * Register user and create database record (called from client)
 */
router.post('/register-firebase-user', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) return validationError(res, 'userId and email are required');

    // Check if already exists
    const exists = await db.query('SELECT user_id FROM user_personal_info WHERE user_id = $1', [userId]);
    if (exists.rows.length > 0) {
      return successResponse(res, { success: true, alreadyExists: true });
    }

    // Check if admin email
    const ADMIN_EMAILS = ['starshiptechnology1@gmail.com', 'wsabol39@gmail.com'];
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());

    // Create records with admin flag (with built-in duplicate protection)
    const result = await createUserDatabaseRecords(userId, email, '', '', isAdminEmail);

    // Log only if new user was created
    if (!result.alreadyExists) {
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
    }

    return successResponse(res, { success: true });
  } catch (err) {
    // Handle duplicate key errors gracefully (this is expected behavior)
    if (err.message?.includes('duplicate key') || err.code === '23505') {
      return successResponse(res, { success: true, alreadyExists: true });
    }
    
    // Log unexpected errors
    console.error('[REGISTER-FIREBASE-USER] Unexpected error:', {
      userId: req.body?.userId,
      error: err.message,
      code: err.code,
      stack: err.stack
    });
    return serverError(res, 'Failed to register user');
  }
});

/**
 * POST /auth/register-and-migrate
 * Register account and migrate onboarding data from temp account
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
      return validationError(res, 'Email, password, and temp_user_id are required');
    }

    // Check if admin email
    const ADMIN_EMAILS = ['starshiptechnology1@gmail.com', 'wsabol39@gmail.com'];
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());

    // Step 1: Create permanent Firebase user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName || ''} ${lastName || ''}`.trim()
    });
    
    const newUserId = userRecord.uid;

    // Step 2: Create database records with admin flag
    await createUserDatabaseRecords(newUserId, email, firstName, lastName, isAdminEmail);

    try {
      // Step 3: Migrate onboarding data
      const migrationResult = await migrateOnboardingData({
        newUserId,
        temp_user_id,
        firstName: firstName || '',
        lastName: lastName || '',
        email,
        onboarding_first_message,
        onboarding_horoscope
      });
      
            return createdResponse(res, {
        success: true,
        message: 'Account created and onboarding data migrated successfully'
      });
      
    } catch (migrationErr) {
            return createdResponse(res, {
        success: true,
        message: 'Account created successfully'
      });
    }
    
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return validationError(res, 'Email address already registered');
    }
    return serverError(res, 'Failed to register and migrate account');
  }
});

export default router;
