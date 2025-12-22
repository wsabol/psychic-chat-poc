import { useState, useCallback, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';
import { isBirthInfoError } from '../../../utils/birthInfoErrorHandler';
import { zodiacSigns } from '../../../data/ZodiacSigns';

/**
 * Hook to fetch and merge astrology data with zodiac enrichment
 */
export function useAstrologyData(userId, token) {
  const [astroData, setAstroData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAstrologyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
      
      const response = await fetchWithTokenRefresh(`${API_URL}/user-astrology/${userId}`, { 
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Your birth chart is being calculated. Please refresh in a moment.';
        
        // Check if this is a birth info error
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      let astroDataObj = data.astrology_data;
      if (typeof astroDataObj === 'string') {
        astroDataObj = JSON.parse(astroDataObj);
      }

      // Get zodiac enrichment data from ZodiacSigns.js
      const sunSignKey = astroDataObj.sun_sign?.toLowerCase();
      const zodiacEnrichment = zodiacSigns[sunSignKey] || {};

      // Merge API calculated data with zodiac enrichment
      const mergedAstroData = {
        ...astroDataObj,
        ...zodiacEnrichment
      };

      setAstroData({
        ...data,
        astrology_data: mergedAstroData
      });
      setLoading(false);
    } catch (err) {
      setError('Unable to load your birth chart. Please try again.');
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    fetchAstrologyData();
  }, [fetchAstrologyData]);

  return {
    astroData,
    loading,
    error,
    fetchAstrologyData
  };
}
