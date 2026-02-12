import { useState, useEffect } from 'react';
import { fetchHoroscope, generateHoroscope, fetchAstrologyData } from '../utils/horoscopeAPI';
import { useHoroscopePolling } from './useHoroscopePolling';
import { isBirthInfoError } from '../utils/birthInfoErrorHandler';
import { logErrorFromCatch } from '../shared/errorLogger.js';

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

      // If not found, generate new horoscope (synchronous - returns data immediately)
      setGenerating(true);
      const generateResponse = await generateHoroscope(userId, horoscopeRange, token);

      if (!generateResponse.ok) {
        const errorMsg = generateResponse.data?.error || 'Could not generate horoscope';
        
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        setGenerating(false);
        return;
      }

      // POST returns data immediately - no polling needed!
      setHoroscopeData(generateResponse.data);
      setGenerating(false);
      setLoading(false);
    } catch (err) {
      logErrorFromCatch('[HOROSCOPE] Error loading horoscope:', err);
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

