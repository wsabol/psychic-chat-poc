import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMoonPhase, generateMoonPhase } from '../utils/moonPhaseAPI';
import { useSSE } from './useSSE';
import { isBirthInfoError } from '../utils/birthInfoErrorHandler';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * useMoonPhaseData Hook
 * Handles moon phase data loading, generation, and SSE notifications
 * NO POLLING - Uses Server-Sent Events for real-time updates
 */
export function useMoonPhaseData(userId, token, currentPhase, isAuthenticated) {
  const [moonPhaseData, setMoonPhaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
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
        logErrorFromCatch('[MOON-PHASE] Error fetching after SSE notification:', err);
      }
    }
  }, [userId, currentPhase, token]);

  // Initialize SSE connection for real-time notifications
  useSSE(userId, token, isAuthenticated, handleSSEMessage);

  const loadMoonPhaseData = async () => {
    if (!currentPhase) return;

    setLoading(true);
    setError(null);
    setMoonPhaseData(null);
    setGenerating(false);
    setHasAutoPlayed(false);
    waitingForPhaseRef.current = null;

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
      waitingForPhaseRef.current = currentPhase;
      
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
        setGenerating(false);
        waitingForPhaseRef.current = null;
        return;
      }

      // SSE will notify when response is ready - no polling needed!
      // Data will be loaded via handleSSEMessage callback
      
    } catch (err) {
      logErrorFromCatch('[MOON-PHASE] Error loading moon phase:', err);
      setError('Unable to load moon phase data. Please try again.');
      setLoading(false);
      setGenerating(false);
      waitingForPhaseRef.current = null;
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
    setError
  };
}
