import { useState, useCallback } from 'react';
import { hashUserIdForUrl } from '../utils/userHashUtils';
import { logErrorFromCatch, logWarning } from '../shared/errorLogger.js';

/**
 * Hook to poll for astrology calculation completion
 * Waits for moon_sign and rising_sign to be calculated, with timeout
 */
export function useAstrologyPolling() {
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Poll for astrology data until calculation complete or timeout
   * @param {string} userId - User ID
   * @param {string} token - Auth token
   * @param {string} apiUrl - API base URL
   * @param {Object} options - Configuration options
   * @param {number} options.maxAttempts - Max polling attempts (default: 30 = 3 seconds)
   * @param {number} options.intervalMs - Interval between attempts in ms (default: 100)
   * @param {Function} options.onReady - Callback when astrology is ready
   * @param {Function} options.onTimeout - Callback if timeout reached
   * @returns {Promise<boolean>} - True if ready before timeout, false if timeout
   */
  const pollForAstrology = useCallback(
    async (userId, token, apiUrl, options = {}) => {
      const {
        maxAttempts = 30,
        intervalMs = 100,
        onReady = null,
        onTimeout = null
      } = options;

      setIsChecking(true);

      try {
        let attempts = 0;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Hash userId for URL (required by validateUserHash middleware)
        const hashedUserId = await hashUserIdForUrl(userId);

        while (attempts < maxAttempts) {
          try {
            const response = await fetch(`${apiUrl}/user-astrology/${hashedUserId}`, { headers });

            if (response.ok) {
              const data = await response.json();
              const astroData =
                typeof data.astrology_data === 'string'
                  ? JSON.parse(data.astrology_data)
                  : data.astrology_data;





                            // Check if calculation complete (has moon and rising signs)
              if (astroData?.moon_sign && astroData?.rising_sign) {
                if (onReady) onReady();
                setIsChecking(false);
                return true;
              }
            }
                    } catch (err) {
            // Retry on error
          }

          attempts++;
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        // Timeout reached
        const totalWaitMs = maxAttempts * intervalMs;
        logWarning(
          `[ASTRO-POLLING] Timeout after ${totalWaitMs}ms, proceeding without astrology`
        );

        if (onTimeout) onTimeout();
        setIsChecking(false);
        return false;
      } catch (err) {
        logErrorFromCatch('[ASTRO-POLLING] Unexpected error:', err);
        setIsChecking(false);
        return false;
      }
    },
    []
  );

  return {
    pollForAstrology,
    isChecking
  };
}

