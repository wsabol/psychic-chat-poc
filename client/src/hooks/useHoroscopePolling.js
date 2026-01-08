import { useRef, useCallback } from 'react';

/**
 * useHoroscopePolling Hook
 * Handles polling for horoscope generation with timeout
 */
export function useHoroscopePolling() {
  const pollIntervalRef = useRef(null);

  const startPolling = useCallback((pollFn, maxPolls = 60, interval = 1000) => {
    return new Promise((resolve, reject) => {
      let pollCount = 0;

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        pollCount++;

        try {
          const result = await pollFn();
          if (result) {
            clearInterval(pollIntervalRef.current);
            resolve(result);
          }
        } catch (err) {
          console.error('[POLLING] Poll error:', err);
        }

        if (pollCount >= maxPolls) {
          clearInterval(pollIntervalRef.current);
          reject(new Error('Horoscope generation is taking longer than expected (60+ seconds). Please try again.'));
        }
      }, interval);
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  return { startPolling, stopPolling, pollIntervalRef };
}
