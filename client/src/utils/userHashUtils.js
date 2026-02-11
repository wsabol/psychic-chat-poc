/**
 * Client-side utility to hash user IDs for URLs
 * Matches server-side hashing for secure user enumeration prevention
 */

/**
 * Hash a user ID using HMAC-SHA256 matching server implementation
 * @param {string} userId - The user ID to hash
 * @returns {string} URL-safe hash
 */
export async function hashUserIdForUrl(userId) {
  if (!userId) return null;

  try {
    // Use the same secret as the server (must match USER_HASH_SECRET env var)
    // For development, using default secret. In production, this should match the server's secret.
    const secret = process.env.REACT_APP_USER_HASH_SECRET || 'default-secret-change-in-production';
    
    const encoder = new TextEncoder();
    
    // Import the secret as a CryptoKey for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the userId with HMAC-SHA256
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(userId)
    );
    
    // Convert to base64url format (matching server implementation)
    const hashArray = Array.from(new Uint8Array(signature));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 32);
    
    return hashBase64;
  } catch (err) {
    console.error('[USER-HASH] Client-side hashing failed:', err);
    // Fallback: return original userId if hashing fails
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
