import crypto from 'crypto';

/**
 * Hash user_id deterministically for audit/log tables
 * Same input always produces same hash
 * Cannot be reversed
 * @param {string} userId - The user_id to hash
 * @returns {string} SHA256 hash (64 chars)
 */
export function hashUserId(userId) {
  if (!userId) return null;
  return crypto
    .createHash('sha256')
    .update(userId)
    .digest('hex')
    .substring(0, 64);
}

/**
 * Hash temp_user_id the same way
 * @param {string} tempUserId - The temp_user_id to hash
 * @returns {string} SHA256 hash (64 chars)
 */
export function hashTempUserId(tempUserId) {
  if (!tempUserId) return null;
  return crypto
    .createHash('sha256')
    .update(tempUserId)
    .digest('hex')
    .substring(0, 64);
}
