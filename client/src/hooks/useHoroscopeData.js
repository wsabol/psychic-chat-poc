import { useState, useEffect } from 'react';
import { fetchHoroscope, generateHoroscope, fetchAstrologyData } from '../utils/horoscopeAPI';
import { useHoroscopePolling } from './useHoroscopePolling';
import { isBirthInfoError } from '../utils/birthInfoErrorHandler';

/**
 * useHoroscopeData Hook
 * Handles horoscope loading, generation, polling, and compliance
 */
export function useHoroscopeData(userId, token, horoscopeRange, astroInfo) {
  const [horoscopeData, setHoroscopeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  
  const { startPolling, stopPolling } = useHoroscopePolling();

  const loadHoroscope = async () => {
    setLoading(true);
    setError(null);
    setHoroscopeData(null);
    setGenerating(false);
    setHasAutoPlayed(false);

    try {
      // Try to fetch existing horoscope
      const result = await fetchHoroscope(userId, horoscopeRange, token);

      // CHECK FOR COMPLIANCE REQUIREMENT (HTTP 451)
      if (result.status === 451) {
        setComplianceStatus(result.data.details);
        setLoading(false);
        return;
      }

      if (result.ok) {
        setHoroscopeData(result.data);
        setComplianceStatus(null);
        setLoading(false);
        return;
      }

      // If not found, generate new horoscope
      setGenerating(true);
      const generateResponse = await generateHoroscope(userId, horoscopeRange, token);

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

      // Start polling for generation result
      // Wait 2 seconds before polling - gives worker time to commit data
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        const data = await startPolling(
          async () => {
            const pollResult = await fetchHoroscope(userId, horoscopeRange, token);
            return pollResult.ok ? pollResult.data : null;
          },
          60,  // maxPolls
          1000 // interval
        );

        setHoroscopeData(data);
        setGenerating(false);
        setLoading(false);
      } catch (pollError) {
        setError(pollError.message);
        setGenerating(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('[HOROSCOPE] Error loading horoscope:', err);
      setError('Unable to load your horoscope. Please try again.');
      setLoading(false);
    }
  };

  return {
    horoscopeData,
    loading,
    generating,
    error,
    complianceStatus,
    hasAutoPlayed,
    setHasAutoPlayed,
    loadHoroscope,
    setComplianceStatus,
    setError,
    stopPolling
  };
}

