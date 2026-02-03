import { useState, useCallback, useRef } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { isBirthInfoError } from '../utils/birthInfoErrorHandler';
import { buildHoroscopeData, HOROSCOPE_CONFIG } from '../utils/horoscopeUtils';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { useSSE } from './useSSE';

/**
 * Hook to manage horoscope fetching, generation, and SSE notifications
 * NO POLLING - Uses Server-Sent Events for real-time updates
 * 
 * Returns horoscopeState object with: data, loading, generating, error
 */
export function useHoroscopeFetch(userId, token, apiUrl, horoscopeRange, isAuthenticated) {
  const [horoscopeData, setHoroscopeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const waitingForRangeRef = useRef(null);

  /**
   * SSE notification handler - called when horoscope is ready
   */
  const handleSSEMessage = useCallback(async (data) => {
    // Check if this notification is for the horoscope range we're waiting for
    if (data.type === 'message_ready' && data.role === 'horoscope') {
      // Only reload if we're waiting for this specific range
      if (waitingForRangeRef.current === data.range) {
        try {
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const response = await fetchWithTokenRefresh(
            `${apiUrl}/horoscope/${userId}/${data.range}`,
            { headers }
          );

          if (response.ok) {
            const responseData = await response.json();
            setHoroscopeData(buildHoroscopeData(responseData, data.range));
            setGenerating(false);
            setLoading(false);
            waitingForRangeRef.current = null;
          }
        } catch (err) {
          logErrorFromCatch('[HOROSCOPE-FETCH] Error fetching after SSE notification:', err);
        }
      }
    }
  }, [userId, token, apiUrl]);

  // Initialize SSE connection for real-time notifications
  useSSE(userId, token, isAuthenticated, handleSSEMessage);

  /**
   * Load horoscope (cached or trigger generation)
   */
  const loadHoroscope = useCallback(
    async () => {
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
        waitingForRangeRef.current = horoscopeRange;
        
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
          setGenerating(false);
          waitingForRangeRef.current = null;
          return;
        }

        // SSE will notify when response is ready - no polling needed!
        // Data will be loaded via handleSSEMessage callback
      } catch (err) {
        logErrorFromCatch('[HOROSCOPE-FETCH] Error loading horoscope:', err);
        setError('Unable to load your horoscope. Please try again.');
        setLoading(false);
        setGenerating(false);
        waitingForRangeRef.current = null;
      }
    },
    [userId, token, apiUrl, horoscopeRange]
  );

  // ✅ Return horoscopeState object as expected by HoroscopePage
  return {
    horoscopeState: {
      data: horoscopeData,
      loading,
      generating,
      error
    },
    complianceStatus,
    setComplianceStatus,
    loadHoroscope,
    stopPolling: () => {} // No-op since we use SSE instead of polling
  };
}
