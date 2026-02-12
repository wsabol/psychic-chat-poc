import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchMoonPhase, generateMoonPhase } from '../../../utils/moonPhaseAPI';
import { useSSE } from '../../../hooks/useSSE';
import { isBirthInfoError } from '../../../utils/birthInfoErrorHandler';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Hook to manage moon phase fetching, generation, and SSE notifications
 * NO POLLING - Uses Server-Sent Events for real-time updates
 */
export function useMoonPhaseFetch(userId, token, currentPhase, isAuthenticated) {
  const [moonPhaseData, setMoonPhaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const waitingForPhaseRef = useRef(null);

  // SSE notification handler - called when moon phase is ready
  const handleSSEMessage = useCallback(async (data) => {
    // Check if this notification is for the moon phase we're waiting for
    if (data.type === 'message_ready' && waitingForPhaseRef.current === currentPhase) {
      try {
        const result = await fetchMoonPhase(userId, currentPhase, token);
        if (result.ok) {
          setMoonPhaseData(result.data);
          setLastUpdated(new Date(result.data.generatedAt).toLocaleString());
          setGenerating(false);
          setLoading(false);
          waitingForPhaseRef.current = null;
        }
      } catch (err) {
        logErrorFromCatch('[MOON-PHASE-FETCH] Error fetching after SSE notification:', err);
      }
    }
  }, [userId, currentPhase, token]);

  // Initialize SSE connection for real-time notifications
  useSSE(userId, token, isAuthenticated, handleSSEMessage);

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
    waitingForPhaseRef.current = null;

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
      waitingForPhaseRef.current = currentPhase;
      
      const generateResult = await generateMoonPhase(userId, currentPhase, token);

      if (!generateResult.ok) {
        const errorMsg = generateResult.data?.error || 'Could not generate moon phase commentary';
        
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        setGenerating(false);
        waitingForPhaseRef.current = null;
        return;
      }

      // SYNCHRONOUS: Use data from POST response immediately (no SSE wait)
      setMoonPhaseData(generateResult.data);
      setLastUpdated(new Date(generateResult.data.generatedAt).toLocaleString());
      setGenerating(false);
      setLoading(false);
      waitingForPhaseRef.current = null;
      
    } catch (err) {
      logErrorFromCatch('[MOON-PHASE-FETCH] Error loading moon phase:', err);
      setError('Unable to load moon phase data. Please try again.');
      setLoading(false);
      setGenerating(false);
      waitingForPhaseRef.current = null;
    }
  }, [userId, token, currentPhase]);

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
    stopPolling: () => {} // No-op since we use SSE instead of polling
  };
}
