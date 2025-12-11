/**
 * Session Tokenizer
 * Handles cryptographic token generation and hashing
 * SECURITY: Tokens are hashed before database storage
 */

import crypto from 'crypto';

const TOKEN_LENGTH = 32; // bytes for randomBytes

/**
 * Generate a new session token (plaintext)
 * This is what gets sent to the client
 * @returns {string} Hex-encoded random token
 */
export function generateSessionToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a session token for database storage
 * @param {string} token - Plaintext token from client
 * @returns {string} SHA-256 hash
 */
export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a plaintext token matches a stored hash
 * @param {string} token - Plaintext token
 * @param {string} hash - Stored hash
 * @returns {boolean}
 */
export function verifySessionToken(token, hash) {
  const computedHash = hashSessionToken(token);
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
}

export default {
  generateSessionToken,
  hashSessionToken,
  verifySessionToken
};
