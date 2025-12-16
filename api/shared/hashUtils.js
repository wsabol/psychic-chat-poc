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

/**
 * Create URL-safe hash for user IDs (for URL parameters)
 * Uses a secret salt to prevent enumeration attacks
 * @param {string} userId - The user_id to hash
 * @returns {string} URL-safe hash (shorter, base64url)
 */
export function createUrlSafeUserHash(userId) {
  if (!userId) return null;
  const secret = process.env.USER_HASH_SECRET || 'default-secret-change-in-production';
  return crypto
    .createHmac('sha256', secret)
    .update(userId)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 32);
}

/**
 * Verify that a hashed user ID matches the actual user ID
 * @param {string} userId - The actual user ID to verify
 * @param {string} hash - The hash from the URL
 * @returns {boolean} True if hash matches user ID
 */
export function verifyUserHash(userId, hash) {
  if (!userId || !hash) return false;
  const expectedHash = createUrlSafeUserHash(userId);
  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(hash)
    );
  } catch (err) {
    return false;
  }
}
