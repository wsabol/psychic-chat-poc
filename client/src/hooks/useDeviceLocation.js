import { useCallback } from 'react';

/**
 * useDeviceLocation - Get approximate city location from IP
 */
export function useDeviceLocation() {
  const getLocationFromIP = useCallback(async () => {
    try {
      // Using ip-api.com free tier (no key required, 45 requests/min)
      const response = await fetch('https://ip-api.com/json/');
      if (!response.ok) throw new Error('Failed to get location');
      
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          city: data.city,
          region: data.regionName,
          country: data.country,
          ip: data.query,
          latitude: data.lat,
          longitude: data.lon
        };
      } else {
        console.warn('[DEVICE] Location API error:', data.message);
        return null;
      }
    } catch (err) {
      console.error('[DEVICE] Error getting location:', err.message);
      return null;
    }
  }, []);

  const getDeviceInfo = useCallback(async () => {
    try {
      const location = await getLocationFromIP();
      const deviceName = location ? `${location.city}, ${location.country}` : 'Unknown Location';
      
      return {
        deviceName,
        location,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('[DEVICE] Error getting device info:', err);
      return null;
    }
  }, [getLocationFromIP]);

  return {
    getLocationFromIP,
    getDeviceInfo
  };
}
