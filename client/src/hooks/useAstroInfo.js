import { useState, useCallback } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * Custom hook to fetch and manage user astrology info
 */
export function useAstroInfo(userId, token) {
  const [astroInfo, setAstroInfo] = useState(null);

  const fetch = useCallback(async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetchWithTokenRefresh(
        `${API_URL}/user-astrology/${userId}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        let astroDataObj = data.astrology_data;
        
        if (typeof astroDataObj === 'string') {
          astroDataObj = JSON.parse(astroDataObj);
        }

        setAstroInfo({
          ...data,
          astrology_data: astroDataObj
        });
        
        return astroDataObj;
      }
    } catch (err) {
      console.error('[ASTRO-INFO-HOOK] Error fetching astro info:', err);
    }
    
    return null;
  }, [userId, token]);

  return {
    astroInfo,
    fetchAstroInfo: fetch
  };
}
