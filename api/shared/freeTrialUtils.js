import crypto from 'crypto';
import { hashTempUserId, hashIpAddress } from './hashUtils.js';
import { logErrorFromCatch } from './errorLogger.js';

/**
 * Create free trial session for temp user
 * Uses IP HASHING (not encryption) so same IP always produces same hash
 * @param {string} tempUserId - Temporary user ID
 * @param {string} ipAddress - Client IP address
 * @param {Object} pool - Database connection pool
 * @returns {Promise<Object>} Session data or error
 */
export async function createFreeTrialSession(tempUserId, ipAddress, db) {
  if (!tempUserId || !ipAddress || !db) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const ipHash = hashIpAddress(ipAddress);
    const userIdHash = hashTempUserId(tempUserId);
    
    // FIRST: Check if this user already has a session (prevents duplicate key errors)
    const existingUserSession = await db.query(
      `SELECT id, current_step, is_completed FROM free_trial_sessions 
       WHERE user_id_hash = $1 
       LIMIT 1`,
      [userIdHash]
    );

    if (existingUserSession.rows.length > 0) {
      const session = existingUserSession.rows[0];
      // Return existing session instead of creating duplicate
      return {
        success: true,
        sessionId: session.id,
        currentStep: session.current_step,
        resuming: true,
        message: session.is_completed ? 'Trial already completed' : `Resuming from step: ${session.current_step}`
      };
    }
    
    // CHECK WHITELIST - whitelisted IPs get unlimited trials
    const whitelistCheck = await db.query(
      'SELECT id FROM free_trial_whitelist WHERE ip_address_hash = $1',
      [ipHash]
    );

    const isWhitelisted = whitelistCheck.rows.length > 0;
    
    // Check if IP has already completed a trial
    const completedCheck = await db.query(
      `SELECT id, current_step FROM free_trial_sessions 
       WHERE ip_address_hash = $1 AND is_completed = true
       ORDER BY started_at DESC
       LIMIT 1`,
      [ipHash]
    );

    // If IP found with completed trial, block access UNLESS whitelisted
    if (completedCheck.rows.length > 0 && !isWhitelisted) {
      return { 
        success: false, 
        error: 'This IP address has already completed the free trial',
        alreadyCompleted: true
      };
    }

    // No existing session - create new one
    // Note: email will be added later when personal info is saved
    const sessionId = crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO free_trial_sessions 
       (id, ip_address_hash, ip_address_encrypted, user_id_hash, current_step, is_completed, started_at, last_activity_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, current_step, started_at`,
      [sessionId, ipHash, ipAddress, userIdHash, 'chat', false]
    );

    return {
      success: true,
      sessionId: result.rows[0].id,
      currentStep: result.rows[0].current_step,
      startedAt: result.rows[0].started_at
    };
  } catch (err) {
    // Don't log duplicate key errors - they're expected due to race conditions
    if (!err.message?.includes('duplicate key')) {
      logErrorFromCatch(err, 'free-trial', 'Error creating session');
    }
    return { success: false, error: 'Unable to create session' };
  }
}

/**
 * Update free trial session progress
 * @param {string} tempUserId - Temporary user ID
 * @param {string} newStep - New step ('chat', 'personal_info', 'horoscope', 'completed')
 * @param {Object} pool - Database connection pool
 * @returns {Promise<Object>} Updated session data or error
 */
export async function updateFreeTrialStep(tempUserId, newStep, db) {
  if (!tempUserId || !newStep || !db) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const userIdHash = hashTempUserId(tempUserId);
    const isCompleted = newStep === 'completed' || newStep === 'horoscope';

    const result = await db.query(
      `UPDATE free_trial_sessions 
       SET current_step = $1, 
           is_completed = $2,
           completed_at = CASE WHEN $2 = true THEN NOW() ELSE completed_at END,
           last_activity_at = NOW()
       WHERE user_id_hash = $3
       RETURNING id, current_step, is_completed, completed_at, last_activity_at`,
      [newStep, isCompleted, userIdHash]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    return {
      success: true,
      sessionId: result.rows[0].id,
      currentStep: result.rows[0].current_step,
      isCompleted: result.rows[0].is_completed,
      completedAt: result.rows[0].completed_at,
      lastActivityAt: result.rows[0].last_activity_at
    };
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', 'Error updating step');
    return { success: false, error: 'Unable to update progress' };
  }
}

/**
 * Mark free trial as completed
 * @param {string} tempUserId - Temporary user ID
 * @param {Object} pool - Database connection pool
 * @returns {Promise<Object>} Completion data or error
 */
export async function completeFreeTrialSession(tempUserId, db) {
  if (!tempUserId || !db) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const userIdHash = hashTempUserId(tempUserId);

    const result = await db.query(
      `UPDATE free_trial_sessions 
       SET is_completed = true,
           current_step = 'completed',
           completed_at = NOW(),
           last_activity_at = NOW()
       WHERE user_id_hash = $1
       RETURNING id, completed_at`,
      [userIdHash]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    return {
      success: true,
      sessionId: result.rows[0].id,
      completedAt: result.rows[0].completed_at
    };
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', 'Error completing session');
    return { success: false, error: 'Unable to complete session' };
  }
}

/**
 * Get free trial session for a user
 * @param {string} tempUserId - Temporary user ID
 * @param {Object} pool - Database connection pool
 * @returns {Promise<Object>} Session data or error
 */
export async function getFreeTrialSession(tempUserId, db) {
  if (!tempUserId || !db) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const userIdHash = hashTempUserId(tempUserId);

    const result = await db.query(
      `SELECT id, current_step, is_completed, started_at, completed_at, last_activity_at
       FROM free_trial_sessions 
       WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Session not found', notFound: true };
    }

    return {
      success: true,
      sessionId: result.rows[0].id,
      currentStep: result.rows[0].current_step,
      isCompleted: result.rows[0].is_completed,
      startedAt: result.rows[0].started_at,
      completedAt: result.rows[0].completed_at,
      lastActivityAt: result.rows[0].last_activity_at
    };
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', 'Error retrieving session');
    return { success: false, error: 'Unable to retrieve session' };
  }
}

export default {
  createFreeTrialSession,
  updateFreeTrialStep,
  completeFreeTrialSession,
  getFreeTrialSession
};
