import { useState, useEffect } from 'react';
import { hashUserIdForUrl } from '../utils/userHashUtils';

/**
 * Hook to hash a user ID for safe URL usage
 * Automatically hashes when userId changes
 * @param {string} userId - The user ID to hash
 * @returns {string} Hashed user ID (or original while hashing)
 */
export function useHashedUserId(userId) {
  const [hashedId, setHashedId] = useState(userId);

  useEffect(() => {
    if (!userId) {
      setHashedId(null);
      return;
    }

    let isMounted = true;

    // Hash the user ID asynchronously
    hashUserIdForUrl(userId)
      .then(hash => {
        if (isMounted) {
          setHashedId(hash);
        }
      })
      .catch(err => {
        console.error('[useHashedUserId] Hashing failed:', err);
        if (isMounted) {
          setHashedId(userId); // Fallback to original
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return hashedId;
}
