import { useState, useEffect } from 'react';
import { fetchMoonPhase, generateMoonPhase } from '../utils/moonPhaseAPI';
import { useHoroscopePolling } from './useHoroscopePolling';
import { isBirthInfoError } from '../utils/birthInfoErrorHandler';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * useMoonPhaseData Hook
 * Handles moon phase data loading, generation, and polling
 */
export function useMoonPhaseData(userId, token, currentPhase) {
  const [moonPhaseData, setMoonPhaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { startPolling, stopPolling } = useHoroscopePolling();

  const loadMoonPhaseData = async () => {
    if (!currentPhase) return;

    setLoading(true);
    setError(null);
    setMoonPhaseData(null);
    setGenerating(false);
    setHasAutoPlayed(false);

    try {
      // Try to fetch existing moon phase data
      const result = await fetchMoonPhase(userId, currentPhase, token);

      if (result.ok) {
        setMoonPhaseData(result.data);
        setLastUpdated(new Date(result.data.generatedAt).toLocaleString());
        setLoading(false);
        return;
      }

      // If not found, generate new moon phase commentary
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

      // Start polling for generation result
      // Wait 2 seconds before polling - gives worker time to commit data
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        const data = await startPolling(
          async () => {
            const pollResult = await fetchMoonPhase(userId, currentPhase, token);
            return pollResult.ok ? pollResult.data : null;
          },
          60,  // maxPolls
          1000 // interval
        );

        setMoonPhaseData(data);
        setLastUpdated(new Date(data.generatedAt).toLocaleString());
        setGenerating(false);
        setLoading(false);
      } catch (pollError) {
        setError(pollError.message);
        setGenerating(false);
        setLoading(false);
      }
    } catch (err) {
      logErrorFromCatch('[MOON-PHASE] Error loading moon phase:', err);
      setError('Unable to load moon phase data. Please try again.');
      setLoading(false);
    }
  };

  return {
    moonPhaseData,
    loading,
    generating,
    error,
    hasAutoPlayed,
    setHasAutoPlayed,
    lastUpdated,
    loadMoonPhaseData,
    setError,
    stopPolling
  };
}
