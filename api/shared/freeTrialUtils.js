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
    
    // CHECK WHITELIST FIRST - whitelisted IPs get unlimited trials
    const whitelistCheck = await db.query(
      'SELECT id FROM free_trial_whitelist WHERE ip_address_hash = $1',
      [ipHash]
    );

    const isWhitelisted = whitelistCheck.rows.length > 0;
    
    // Check if IP has already completed a trial (deterministic hash allows this!)
    const completedCheck = await db.query(
      `SELECT id, current_step FROM free_trial_sessions 
       WHERE ip_address_hash = $1 
       ORDER BY started_at DESC
       LIMIT 1`,
      [ipHash]
    );

    // If IP found with completed trial, block access UNLESS whitelisted
    if (completedCheck.rows.length > 0) {
      const existingSession = completedCheck.rows[0];
      
      if (existingSession.current_step === 'completed') {
        // If whitelisted, allow creating new trial session
        if (!isWhitelisted) {
          return { 
            success: false, 
            error: 'This IP address has already completed the free trial',
            alreadyCompleted: true
          };
        }
        // Continue to create new session for whitelisted IP
      } else {
        // If incomplete trial exists (and not whitelisted), return it for resumption
        if (!isWhitelisted) {
          return {
            success: true,
            sessionId: existingSession.id,
            currentStep: existingSession.current_step,
            resuming: true,
            message: `Resuming from step: ${existingSession.current_step}`
          };
        }
        // Whitelisted users can start fresh sessions even with incomplete ones
      }
    }

    // No existing session - create new one
    const sessionId = crypto.randomUUID();
    const userIdHash = hashTempUserId(tempUserId);

    const result = await db.query(
      `INSERT INTO free_trial_sessions 
       (id, ip_address_hash, user_id_hash, current_step, is_completed, started_at, last_activity_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, current_step, started_at`,
      [sessionId, ipHash, userIdHash, 'chat', false]
    );

    return {
      success: true,
      sessionId: result.rows[0].id,
      currentStep: result.rows[0].current_step,
      startedAt: result.rows[0].started_at
    };
  } catch (err) {
    logErrorFromCatch('Error creating free trial session', err);
    return { success: false, error: err.message };
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
    logErrorFromCatch('Error updating free trial step', err);
    return { success: false, error: err.message };
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
    logErrorFromCatch('Error completing free trial session', err);
    return { success: false, error: err.message };
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
    logErrorFromCatch('Error retrieving free trial session', err);
    return { success: false, error: err.message };
  }
}

export default {
  createFreeTrialSession,
  updateFreeTrialStep,
  completeFreeTrialSession,
  getFreeTrialSession
};
