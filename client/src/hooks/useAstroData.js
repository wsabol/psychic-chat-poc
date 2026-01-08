import { useState, useEffect } from 'react';
import { fetchAstrologyData } from '../utils/horoscopeAPI';

/**
 * useAstroData Hook
 * Loads and manages astrology data
 */
export function useAstroData(userId, token) {
  const [astroInfo, setAstroInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAstroData = async () => {
      try {
        const data = await fetchAstrologyData(userId, token);
        if (data) {
          setAstroInfo(data);
        }
        setLoading(false);
      } catch (err) {
        console.error('[ASTRO] Error fetching astrology data:', err);
        setLoading(false);
      }
    };

    if (!astroInfo) {
      loadAstroData();
    }
  }, [userId, token, astroInfo]);

  return {
    astroInfo,
    loading
  };
}
