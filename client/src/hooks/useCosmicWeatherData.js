import { useState, useCallback, useRef } from 'react';
import { fetchCosmicWeather, generateCosmicWeather } from '../utils/cosmicWeatherAPI';
import { isBirthInfoError } from '../utils/birthInfoErrorHandler';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { useSSE } from './useSSE';

/**
 * Custom hook to handle cosmic weather data fetching and SSE notifications
 * NO POLLING - Uses Server-Sent Events for real-time updates
 */
export function useCosmicWeatherData(userId, token, isAuthenticated) {
  const [cosmicData, setCosmicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const waitingForDataRef = useRef(false);

  /**
   * SSE notification handler - called when cosmic weather is ready
   */
  const handleSSEMessage = useCallback(async (data) => {
    // Check if this notification is for cosmic weather
    if (data.type === 'message_ready' && data.role === 'cosmic_weather') {
      // Only reload if we're waiting for cosmic weather
      if (waitingForDataRef.current) {
        try {
          const responseData = await fetchCosmicWeather(userId, token);
          if (responseData) {
            setCosmicData(responseData);
            setGenerating(false);
            setLoading(false);
            waitingForDataRef.current = false;
          }
        } catch (err) {
          logErrorFromCatch('[COSMIC-WEATHER] Error fetching after SSE notification:', err);
        }
      }
    }
  }, [userId, token]);

  // Initialize SSE connection for real-time notifications
  useSSE(userId, token, isAuthenticated, handleSSEMessage);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCosmicData(null);
    setGenerating(false);

    try {
      // Try to fetch existing cosmic weather
      const data = await fetchCosmicWeather(userId, token);
      
      // If data exists (not generating), use it
      if (data) {
        setCosmicData(data);
        setLoading(false);
        return;
      }
      
      // If null, it means still generating (202 response), fall through to generation
    } catch (err) {
      // Silently proceed to generation - fetch failing is expected when data doesn't exist yet
    }

    // If fetch failed, trigger generation
    try {
      setGenerating(true);
      waitingForDataRef.current = true;
      await generateCosmicWeather(userId, token);
      
      // SSE will notify when response is ready - no polling needed!
      // Data will be loaded via handleSSEMessage callback
    } catch (err) {
      logErrorFromCatch(err, '[COSMIC-WEATHER-HOOK] Generation failed');
      
      if (isBirthInfoError(err?.message)) {
        setError('BIRTH_INFO_MISSING');
      } else {
        setError(err?.message || 'Unable to load cosmic weather. Please try again.');
      }
      
      setGenerating(false);
      setLoading(false);
      waitingForDataRef.current = false;
    }
  }, [userId, token]);

  const cleanup = useCallback(() => {
    // No-op since we use SSE instead of polling
    waitingForDataRef.current = false;
  }, []);

  return {
    cosmicData,
    loading,
    generating,
    error,
    load,
    cleanup
  };
}
