import { useCallback } from 'react';

/**
 * useDeviceSecurityTracking - Track current device after login for security
 */
export function useDeviceSecurityTracking() {
  const trackDevice = useCallback(async (userId, token) => {
    try {
      if (!userId || !token) return;

      // Get device name and IP info
      let deviceName = 'Unknown Device';
      let ipAddress = 'unknown';

      // Try to get geolocation data
      try {
        const geoResponse = await fetch('https://ipapi.co/json/');
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          ipAddress = geoData.ip || 'unknown';
          
          // Build device name from location
          const city = geoData.city || '';
          const country = geoData.country_name || '';
          if (city && country) {
            deviceName = `${city}, ${country}`;
          } else if (country) {
            deviceName = country;
          }
        }
      } catch (err) {
        // Fall back to browser info
        deviceName = `${navigator.userAgent.substring(0, 50)}...`;
      }

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

      // Send to backend
      const response = await fetch(`${API_URL}/security/track-device/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceName,
          ipAddress
        })
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
    } catch (err) {
      // Don't throw - device tracking is non-critical
    }
  }, []);

  return { trackDevice };
}

