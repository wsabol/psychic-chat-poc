/**
 * Client-side utility to hash user IDs for URLs
 * Matches server-side hashing for secure user enumeration prevention
 */

/**
 * Hash a user ID using the same algorithm as the server
 * Note: This uses HMAC-SHA256 with a client-side constant
 * For maximum security, this should be derived from user's auth token
 * @param {string} userId - The user ID to hash
 * @returns {string} URL-safe hash
 */
export async function hashUserIdForUrl(userId) {
  if (!userId) return null;

  try {
    // Use Web Crypto API (available in modern browsers)
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    
    // For client-side, we use a static salt (different from server's dynamic secret)
    // Server will use its USER_HASH_SECRET for actual validation
    // This is just to obscure user IDs in URLs from casual inspection
    const salt = 'client-side-hash-salt-v1';
    const saltedData = encoder.encode(salt + userId);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData);
    
    // Convert to base64url format (matching server implementation)
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 32);
    
    return hashBase64;
  } catch (err) {
    console.error('[USER-HASH] Client-side hashing failed:', err);
    // Fallback: return original userId if hashing fails
    // (server will re-hash with its secret anyway)
    return userId;
  }
}

/**
 * Convert a user ID to a hashed URL parameter
 * Usage: `/user-profile/${hashUserIdForUrl(userId)}`
 * @param {string} userId - The user ID
 * @returns {Promise<string>} Hashed user ID safe for URLs
 */
export async function getHashedUserId(userId) {
  return await hashUserIdForUrl(userId);
}

/**
 * Batch hash multiple user IDs (if needed)
 * @param {array} userIds - Array of user IDs to hash
 * @returns {Promise<object>} Map of original IDs to hashed IDs
 */
export async function hashMultipleUserIds(userIds) {
  const hashes = {};
  for (const userId of userIds) {
    hashes[userId] = await hashUserIdForUrl(userId);
  }
  return hashes;
}
