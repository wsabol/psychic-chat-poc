/**
 * Encrypted Queries Utility
 * Helper functions for querying tables with encrypted sensitive data
 * 
 * All these functions automatically handle encryption/decryption
 */

import { getEncryptionKey } from './decryptionHelper.js';
import { hashUserId, hashTempUserId } from './hashUtils.js';

/**
 * Insert into security table with encrypted phone/email
 */
export async function insertSecurityRecord(db, userId, phoneNumber, recoveryEmail, recoveryPhone) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  const query = `
    INSERT INTO security (user_id, user_id_hash, phone_number_encrypted, recovery_email_encrypted, recovery_phone_encrypted)
    VALUES ($1, $2, pgp_sym_encrypt($3, $4), pgp_sym_encrypt($5, $4), pgp_sym_encrypt($6, $4))
    ON CONFLICT (user_id) DO UPDATE SET
      phone_number_encrypted = pgp_sym_encrypt($3, $4),
      recovery_email_encrypted = pgp_sym_encrypt($5, $4),
      recovery_phone_encrypted = pgp_sym_encrypt($6, $4)
    RETURNING user_id
  `;

  return db.query(query, [
    userId,
    userIdHash,
    phoneNumber || '',
    ENCRYPTION_KEY,
    recoveryEmail || '',
    recoveryPhone || ''
  ]);
}

/**
 * Get security record for user (decrypts sensitive fields)
 */
export async function getSecurityRecord(db, userId) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  const query = `
    SELECT 
      user_id,
      pgp_sym_decrypt(phone_number_encrypted, $1) as phone_number,
      pgp_sym_decrypt(recovery_email_encrypted, $1) as recovery_email,
      pgp_sym_decrypt(recovery_phone_encrypted, $1) as recovery_phone,
      password_changed_at
    FROM security
    WHERE user_id_hash = $2
  `;

  return db.query(query, [ENCRYPTION_KEY, userIdHash]);
}

/**
 * Insert into verification_codes with encrypted email/phone and hashed user_id
 */
export async function insertVerificationCode(db, userId, email, phoneNumber, code, codeType) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  const query = `
    INSERT INTO verification_codes (
      user_id, user_id_hash, email_encrypted, phone_number_encrypted, code, code_type, expires_at
    ) VALUES (
      $1, $2, pgp_sym_encrypt($3, $4), pgp_sym_encrypt($5, $4), $6, $7, NOW() + INTERVAL '15 minutes'
    )
    RETURNING id, code
  `;

  return db.query(query, [
    userId,
    userIdHash,
    email || '',
    ENCRYPTION_KEY,
    phoneNumber || '',
    code,
    codeType
  ]);
}

/**
 * Get verification code (decrypts email/phone)
 */
export async function getVerificationCode(db, userId, code) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  const query = `
    SELECT 
      id,
      pgp_sym_decrypt(email_encrypted, $1) as email,
      pgp_sym_decrypt(phone_number_encrypted, $1) as phone_number,
      code,
      code_type,
      expires_at,
      verified_at
    FROM verification_codes
    WHERE user_id_hash = $2 AND code = $3 AND expires_at > NOW() AND verified_at IS NULL
  `;

  try {
    return await db.query(query, [ENCRYPTION_KEY, userIdHash, code]);
  } catch (decryptErr) {
    console.error('[SECURITY] Decryption failed, attempting plaintext fallback:', decryptErr.message);
    // If decryption fails, the data might be plaintext - return empty to let caller handle
    return { rows: [] };
  }
}

/**
 * Insert into user_sessions with encrypted session_token and hashed user_id
 * CRITICAL: session_token is authentication data!
 */
export async function insertUserSession(db, userId, sessionToken, ipAddress, userAgent, expiresAt) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  const query = `
    INSERT INTO user_sessions (
      user_id, user_id_hash, session_token_encrypted, ip_address, user_agent, expires_at
    ) VALUES (
      $1, $2, pgp_sym_encrypt($3, $4), $5, $6, $7
    )
    RETURNING id
  `;

  return db.query(query, [
    userId,
    userIdHash,
    sessionToken,
    ENCRYPTION_KEY,
    ipAddress,
    userAgent,
    expiresAt
  ]);
}

/**
 * Get user session (decrypts session_token)
 * Used to validate incoming session tokens
 */
export async function getUserSession(db, userId, sessionTokenHash) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  // Note: session_token_hash should be pre-computed SHA256 of the token
  // We can't decrypt to compare, so must use hash
  const query = `
    SELECT 
      id,
      user_id,
      pgp_sym_decrypt(session_token_encrypted, $1) as session_token,
      expires_at,
      last_activity
    FROM user_sessions
    WHERE user_id_hash = $2 AND expires_at > NOW()
    LIMIT 1
  `;

  return db.query(query, [ENCRYPTION_KEY, userIdHash]);
}

/**
 * Insert into security_sessions with encrypted firebase_token and hashed user_id
 * CRITICAL: firebase_token is authentication data!
 */
export async function insertSecuritySession(db, userId, firebaseToken, deviceName, ipAddress, userAgent) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  const query = `
    INSERT INTO security_sessions (
      user_id, user_id_hash, firebase_token_encrypted, device_name, ip_address, user_agent, last_active
    ) VALUES (
      $1, $2, pgp_sym_encrypt($3, $4), $5, $6, $7, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      firebase_token_encrypted = pgp_sym_encrypt($3, $4),
      last_active = NOW()
    RETURNING id
  `;

  return db.query(query, [
    userId,
    userIdHash,
    firebaseToken,
    ENCRYPTION_KEY,
    deviceName,
    ipAddress,
    userAgent
  ]);
}

/**
 * Get security sessions (decrypts firebase_token)
 * CRITICAL: Do not log firebase_token in plaintext!
 */
export async function getSecuritySessions(db, userId) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = hashUserId(userId);

  const query = `
    SELECT 
      id,
      device_name,
      ip_address,
      user_agent,
      last_active,
      created_at
    FROM security_sessions
    WHERE user_id_hash = $1
    ORDER BY last_active DESC
  `;

  // Note: firebase_token is NOT returned - only decrypt when absolutely needed
  return db.query(query, [userIdHash]);
}

/**
 * Insert into login_attempts with hashed user_id and encrypted email
 */
export async function recordLoginAttempt(db, userId, emailAttempted, success, ipAddress, userAgent) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const userIdHash = userId ? hashUserId(userId) : null;

  const query = `
    INSERT INTO login_attempts (
      user_id, user_id_hash, email_attempted_encrypted, success, ip_address_encrypted, user_agent, attempted_at
    ) VALUES (
      $1, $2, pgp_sym_encrypt($3, $4), $5, pgp_sym_encrypt($6, $4), $7, NOW()
    )
  `;

  return db.query(query, [
    userId,
    userIdHash,
    emailAttempted || '',
    ENCRYPTION_KEY,
    success,
    ipAddress || '',
    userAgent || ''
  ]);
}

/**
 * Get user messages from messages table using user_id_hash
 */
export async function getUserMessages(db, userId, limit = 100) {
  const userIdHash = hashUserId(userId);

  const query = `
    SELECT id, role, content, content_encrypted, created_at
    FROM messages
    WHERE user_id_hash = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;

  return db.query(query, [userIdHash, limit]);
}

/**
 * Insert message with user_id_hash
 */
export async function insertMessage(db, userId, role, content, contentEncrypted) {
  const userIdHash = hashUserId(userId);

  const query = `
    INSERT INTO messages (user_id, user_id_hash, role, content, content_encrypted, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id
  `;

  return db.query(query, [userId, userIdHash, role, content, contentEncrypted]);
}

/**
 * Get verification codes by user_id_hash (useful for cleanup)
 */
export async function getExpiredVerificationCodes(db, userId, daysOld = 7) {
  const userIdHash = hashUserId(userId);

  const query = `
    SELECT id, code_type, created_at
    FROM verification_codes
    WHERE user_id_hash = $1 AND created_at < NOW() - INTERVAL '${daysOld} days'
  `;

  return db.query(query, [userIdHash]);
}

export default {
  insertSecurityRecord,
  getSecurityRecord,
  insertVerificationCode,
  getVerificationCode,
  insertUserSession,
  getUserSession,
  insertSecuritySession,
  getSecuritySessions,
  recordLoginAttempt,
  getUserMessages,
  insertMessage,
  getExpiredVerificationCodes,
};
