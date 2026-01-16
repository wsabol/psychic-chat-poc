import { useState, useRef, useCallback } from 'react';
import { fetchCosmicWeather, generateCosmicWeather, pollForCosmicWeather } from '../utils/cosmicWeatherAPI';
import { isBirthInfoError } from '../utils/birthInfoErrorHandler';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * Custom hook to handle cosmic weather data fetching and polling
 * Encapsulates all loading, generating, and error states
 */
export function useCosmicWeatherData(userId, token) {
  const [cosmicData, setCosmicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCosmicData(null);
    setGenerating(false);

    try {
      // Try to fetch existing cosmic weather
      const data = await fetchCosmicWeather(userId, token);
      setCosmicData(data);
      setLoading(false);
      return;
    } catch (err) {
      logErrorFromCatch('[COSMIC-WEATHER-HOOK] Fetch failed, will generate:', err.message);
    }

    // If fetch failed, trigger generation
    try {
      setGenerating(true);
      await generateCosmicWeather(userId, token);
      
      // Clean up any existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Poll for data
      const data = await pollForCosmicWeather(userId, token);
      setCosmicData(data);
      setGenerating(false);
      setLoading(false);
    } catch (err) {
      logErrorFromCatch('[COSMIC-WEATHER-HOOK] Generation failed:', err.message);
      
      if (isBirthInfoError(err.message)) {
        setError('BIRTH_INFO_MISSING');
      } else {
        setError(err.message || 'Unable to load cosmic weather. Please try again.');
      }
      
      setGenerating(false);
      setLoading(false);
    }
  }, [userId, token]);

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
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
