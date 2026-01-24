import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchMoonPhase, generateMoonPhase } from '../../../utils/moonPhaseAPI';
import { isBirthInfoError } from '../../../utils/birthInfoErrorHandler';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

const MOON_PHASE_CONFIG = {
  POLL_INITIAL_DELAY_MS: 2000,
  POLL_INTERVAL_MS: 1000,
  POLL_MAX_ATTEMPTS: 60
};

/**
 * Hook to manage moon phase fetching, generation, and polling
 * Similar pattern to useHoroscopeFetch
 */
export function useMoonPhaseFetch(userId, token, currentPhase) {
  const [moonPhaseData, setMoonPhaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const pollIntervalRef = useRef(null);

  /**
   * Load moon phase data (cached or trigger generation)
   */
  const loadMoonPhase = useCallback(async () => {
    if (!currentPhase) return;

    setLoading(true);
    setError(null);
    setMoonPhaseData(null);
    setGenerating(false);
    setHasAutoPlayed(false);

    try {
      // Try to fetch cached moon phase data
      const result = await fetchMoonPhase(userId, currentPhase, token);

      if (result.ok) {
        setMoonPhaseData(result.data);
        setLastUpdated(new Date(result.data.generatedAt).toLocaleString());
        setLoading(false);
        return;
      }

      // No cached data - trigger generation
      setGenerating(true);
      const generateResponse = await generateMoonPhase(userId, currentPhase, token);

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        const errorMsg = errorData.error || 'Could not generate moon phase commentary';
        
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        return;
      }

      // Start polling for generated result
      await pollForMoonPhase();
    } catch (err) {
      logErrorFromCatch('[MOON-PHASE-FETCH] Error loading moon phase:', err);
      setError('Unable to load moon phase data. Please try again.');
      setLoading(false);
    }
  }, [userId, token, currentPhase]);

  /**
   * Poll for moon phase generation completion
   */
  const pollForMoonPhase = useCallback(async () => {
    let pollCount = 0;

    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Initial delay before first poll
    await new Promise(resolve => setTimeout(resolve, MOON_PHASE_CONFIG.POLL_INITIAL_DELAY_MS));

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;

      try {
        const pollResult = await fetchMoonPhase(userId, currentPhase, token);

        if (pollResult.ok) {
          setMoonPhaseData(pollResult.data);
          setLastUpdated(new Date(pollResult.data.generatedAt).toLocaleString());
          setGenerating(false);
          setLoading(false);
          clearInterval(pollIntervalRef.current);
          return;
        }
      } catch (err) {
        // Silently catch polling errors during generation
        if (pollCount >= MOON_PHASE_CONFIG.POLL_MAX_ATTEMPTS - 1) {
          logErrorFromCatch('[MOON-PHASE-FETCH] Final polling attempt failed:', err);
        }
      }

      // Check if max polls reached
      if (pollCount >= MOON_PHASE_CONFIG.POLL_MAX_ATTEMPTS) {
        setError(
          `Moon phase commentary generation is taking longer than expected (${
            MOON_PHASE_CONFIG.POLL_MAX_ATTEMPTS * (MOON_PHASE_CONFIG.POLL_INTERVAL_MS / 1000)
          }+ seconds). Please try again.`
        );
        setGenerating(false);
        setLoading(false);
        clearInterval(pollIntervalRef.current);
      }
    }, MOON_PHASE_CONFIG.POLL_INTERVAL_MS);
  }, [userId, token, currentPhase]);

  /**
   * Cleanup polling on unmount
   */
  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    moonPhaseState: {
      data: moonPhaseData,
      loading,
      generating,
      error,
      lastUpdated
    },
    hasAutoPlayed,
    setHasAutoPlayed,
    loadMoonPhase,
    stopPolling: cleanup
  };
}
