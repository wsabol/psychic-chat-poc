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
    
    // CHECK WHITELIST FIRST - whitelisted IPs get unlimited trials
    const whitelistCheck = await db.query(
      'SELECT id FROM free_trial_whitelist WHERE ip_address_hash = $1',
      [ipHash]
    );

    const isWhitelisted = whitelistCheck.rows.length > 0;
    
    // Check if this IP has ANY existing trial session (completed or in-progress)
    const existingIpSession = await db.query(
      `SELECT id, current_step, is_completed, user_id_hash, started_at
       FROM free_trial_sessions 
       WHERE ip_address_hash = $1 
       ORDER BY started_at DESC
       LIMIT 1`,
      [ipHash]
    );

    // If IP has an existing session and NOT whitelisted, enforce single trial per IP
    if (existingIpSession.rows.length > 0 && !isWhitelisted) {
      const session = existingIpSession.rows[0];
      
      // Check if this is the SAME user trying to resume (legitimate)
      if (session.user_id_hash === userIdHash) {
        // Same user resuming their session - ALLOW
        return {
          success: true,
          sessionId: session.id,
          currentStep: session.current_step,
          isCompleted: session.is_completed,
          resuming: true,
          message: session.is_completed 
            ? 'Trial already completed' 
            : `Resuming from step: ${session.current_step}`
        };
      }
      
      // DIFFERENT user on same IP - BLOCK (this is the exploit we're fixing)
      return { 
        success: false, 
        error: 'This device has already started a free trial',
        alreadyStarted: true
      };
    }
    
    // Also check if this specific user already has a session (edge case for VPN/proxy changes)
    const existingUserSession = await db.query(
      `SELECT id, current_step, is_completed FROM free_trial_sessions 
       WHERE user_id_hash = $1 
       LIMIT 1`,
      [userIdHash]
    );

    if (existingUserSession.rows.length > 0) {
      const session = existingUserSession.rows[0];
      // User found with existing session (different IP) - allow resume
      return {
        success: true,
        sessionId: session.id,
        currentStep: session.current_step,
        isCompleted: session.is_completed,
        resuming: true,
        message: session.is_completed 
          ? 'Trial already completed' 
          : `Resuming from step: ${session.current_step}`
      };
    }

    // No existing session - create new one
    // Note: email will be added later when personal info is saved
    const sessionId = crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO free_trial_sessions 
       (id, ip_address_hash, ip_address_encrypted, user_id_hash, current_step, is_completed, started_at, last_activity_at)
       VALUES ($1, $2, pgp_sym_encrypt($3, $7), $4, $5, $6, NOW(), NOW())
       RETURNING id, current_step, started_at`,
      [sessionId, ipHash, ipAddress, userIdHash, 'chat', false, process.env.ENCRYPTION_KEY]
    );

    // Create minimal user_personal_info entry so chat can work before full profile is completed
    // This prevents "profile not available" errors during initial chat interaction
    // Include all encrypted fields that the chat handler expects, even if NULL
    try {
      const API_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
      
      // DEBUG: Log key info (first/last 4 chars only)
      if (!API_ENCRYPTION_KEY) {
        logErrorFromCatch(new Error('ENCRYPTION_KEY is undefined!'), 'free-trial', 'CRITICAL: API ENCRYPTION_KEY not set');
      } else {
        const keyPreview = `${API_ENCRYPTION_KEY.substring(0, 4)}...${API_ENCRYPTION_KEY.substring(API_ENCRYPTION_KEY.length - 4)}`;
      }
      
      const insertResult = await db.query(
        `INSERT INTO user_personal_info 
         (user_id, email_encrypted, first_name_encrypted, last_name_encrypted, 
          birth_date_encrypted, birth_time_encrypted, birth_country_encrypted,
          birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted,
          sex_encrypted, familiar_name_encrypted, created_at, updated_at)
         VALUES ($1, pgp_sym_encrypt($2, $5), pgp_sym_encrypt($3, $5), pgp_sym_encrypt($4, $5),
                 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
         RETURNING user_id`,
        [tempUserId, `${tempUserId}@psychic.local`, 'Seeker', 'Soul', API_ENCRYPTION_KEY]
      );
      
      if (insertResult.rows.length === 0) {
        logErrorFromCatch(new Error('No rows returned from user_personal_info insert'), 'free-trial', `Failed to create/update user_personal_info for ${tempUserId}`);
      }

      // CRITICAL: Also create user_preferences record so oracle greeting and chat work properly
      // Without this, queries for timezone/language fail and oracle greeting can't be generated
      await db.query(
        `INSERT INTO user_preferences 
         (user_id_hash, language, oracle_language, timezone, response_type, created_at, updated_at)
         VALUES ($1, 'en-US', 'en-US', 'UTC', 'full', NOW(), NOW())
         ON CONFLICT (user_id_hash) DO UPDATE SET updated_at = NOW()`,
        [userIdHash]
      );
    } catch (err) {
      // CRITICAL: Log detailed error since chat won't work without this
      logErrorFromCatch(err, 'free-trial', `CRITICAL: Failed to create user_personal_info/preferences for ${tempUserId}`);
      throw err; // Re-throw to surface the issue
    }

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
