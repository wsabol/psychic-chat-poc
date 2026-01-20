import crypto from 'crypto';
import { hashTempUserId } from './hashUtils.js';
import { logErrorFromCatch } from './errorLogger.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your_encryption_key_here';

/**
 * Encrypt IP address for storage in database
 * Uses AES-256-CBC encryption
 * @param {string} ipAddress - The IP address to encrypt
 * @returns {string} Encrypted IP as hex string
 */
export function encryptIpAddress(ipAddress) {
  if (!ipAddress) return null;
  
  try {
    // Create IV (initialization vector)
    const iv = crypto.randomBytes(16);
    
    // Create cipher with AES-256-CBC
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)), // Ensure 32 bytes
      iv
    );
    
    // Encrypt the IP
    let encrypted = cipher.update(ipAddress, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    logErrorFromCatch('Error encrypting IP address', err);
    return null;
  }
}

/**
 * Decrypt IP address from database
 * @param {string} encryptedIp - The encrypted IP (IV:encrypted format)
 * @returns {string} Decrypted IP address
 */
export function decryptIpAddress(encryptedIp) {
  if (!encryptedIp) return null;
  
  try {
    // Split IV and encrypted data
    const [ivHex, encrypted] = encryptedIp.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      iv
    );
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    logErrorFromCatch('Error decrypting IP address', err);
    return null;
  }
}

/**
 * Create free trial session for temp user
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
    // Check if IP has already completed a trial
    const completedCheck = await db.query(
      `SELECT id FROM free_trial_sessions 
       WHERE ip_address_encrypted = $1 AND is_completed = true 
       LIMIT 1`,
      [encryptIpAddress(ipAddress)]
    );

    if (completedCheck.rows.length > 0) {
      return { 
        success: false, 
        error: 'This IP address has already completed the free trial',
        alreadyCompleted: true
      };
    }

    // Generate session ID (UUID)
    const sessionId = crypto.randomUUID();
    const userIdHash = hashTempUserId(tempUserId);
    const encryptedIp = encryptIpAddress(ipAddress);

    // Create new session
    const result = await db.query(
      `INSERT INTO free_trial_sessions 
       (id, ip_address_encrypted, user_id_hash, current_step, is_completed, started_at, last_activity_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, current_step, started_at`,
      [sessionId, encryptedIp, userIdHash, 'chat', false]
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
  encryptIpAddress,
  decryptIpAddress,
  createFreeTrialSession,
  updateFreeTrialStep,
  completeFreeTrialSession,
  getFreeTrialSession
};
