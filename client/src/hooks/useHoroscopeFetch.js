import { useState, useCallback, useRef } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { isBirthInfoError } from '../utils/birthInfoErrorHandler';
import { buildHoroscopeData, HOROSCOPE_CONFIG } from '../utils/horoscopeUtils';

/**
 * Hook to manage horoscope fetching, generation, and polling
 */
export function useHoroscopeFetch(userId, token, apiUrl) {
  const [horoscopeData, setHoroscopeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const pollIntervalRef = useRef(null);

  /**
   * Load horoscope (cached or trigger generation)
   */
  const loadHoroscope = useCallback(
    async (horoscopeRange) => {
      setLoading(true);
      setError(null);
      setHoroscopeData(null);
      setGenerating(false);

      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Try to fetch cached horoscope
        const response = await fetchWithTokenRefresh(
          `${apiUrl}/horoscope/${userId}/${horoscopeRange}`,
          { headers }
        );

        // Check for compliance requirement
        if (response.status === 451) {
          const complianceData = await response.json();
          console.log('[HOROSCOPE-FETCH] Compliance required:', complianceData);
          setComplianceStatus(complianceData.details);
          setLoading(false);
          return;
        }

        // If cached horoscope exists, return it
        if (response.ok) {
          const data = await response.json();
          setHoroscopeData(buildHoroscopeData(data, horoscopeRange));
          setComplianceStatus(null);
          setLoading(false);
          return;
        }

        // No cached horoscope - trigger generation
        setGenerating(true);
        const generateResponse = await fetchWithTokenRefresh(
          `${apiUrl}/horoscope/${userId}/${horoscopeRange}`,
          { method: 'POST', headers }
        );

        if (!generateResponse.ok) {
          const errorData = await generateResponse.json();
          const errorMsg = errorData.error || 'Could not generate horoscope';

          if (isBirthInfoError(errorMsg)) {
            setError('BIRTH_INFO_MISSING');
          } else {
            setError(errorMsg);
          }
          setLoading(false);
          return;
        }

        // Start polling for generated horoscope
        await pollForHoroscope(headers, horoscopeRange);
      } catch (err) {
        console.error('[HOROSCOPE-FETCH] Error loading horoscope:', err);
        setError('Unable to load your horoscope. Please try again.');
        setLoading(false);
      }
    },
    [userId, token, apiUrl]
  );

  /**
   * Poll for horoscope generation completion
   */
  const pollForHoroscope = useCallback(
    async (headers, horoscopeRange) => {
      let pollCount = 0;

      // Clear any existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Initial delay before first poll
      await new Promise((resolve) => setTimeout(resolve, HOROSCOPE_CONFIG.POLL_INITIAL_DELAY_MS));

      pollIntervalRef.current = setInterval(async () => {
        pollCount++;

        try {
          const pollResponse = await fetchWithTokenRefresh(
            `${apiUrl}/horoscope/${userId}/${horoscopeRange}`,
            { headers }
          );

          if (pollResponse.ok) {
            const data = await pollResponse.json();
            setHoroscopeData(buildHoroscopeData(data, horoscopeRange));
            setGenerating(false);
            setLoading(false);
            clearInterval(pollIntervalRef.current);
            console.log('[HOROSCOPE-FETCH] ✓ Horoscope ready after polling');
            return;
          }
        } catch (err) {
          console.error('[HOROSCOPE-FETCH] Polling error:', err);
        }

        // Check if max polls reached
        if (pollCount >= HOROSCOPE_CONFIG.POLL_MAX_ATTEMPTS) {
          setError(
            `Horoscope generation is taking longer than expected (${
              HOROSCOPE_CONFIG.POLL_MAX_ATTEMPTS * (HOROSCOPE_CONFIG.POLL_INTERVAL_MS / 1000)
            }+ seconds). Please try again.`
          );
          setGenerating(false);
          setLoading(false);
          clearInterval(pollIntervalRef.current);
        }
      }, HOROSCOPE_CONFIG.POLL_INTERVAL_MS);
    },
    [userId, apiUrl]
  );

  /**
   * Cleanup polling on unmount
   */
  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  }, []);

  return {
    horoscopeData,
    loading,
    generating,
    error,
    complianceStatus,
    loadHoroscope,
    setComplianceStatus,
    cleanup
  };
}
