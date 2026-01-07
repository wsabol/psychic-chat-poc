import { fetchWithTokenRefresh } from './fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * Fetch existing cosmic weather or check if generation is needed
 */
export async function fetchCosmicWeather(userId, token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  const response = await fetchWithTokenRefresh(
    `${API_URL}/astrology-insights/cosmic-weather/${userId}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.weather || data.text || '',
    brief: data.brief || data.weather_brief || '',
    birthChart: data.birthChart,
    planets: data.currentPlanets || []
  };
}

/**
 * Trigger cosmic weather generation
 */
export async function generateCosmicWeather(userId, token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  const response = await fetchWithTokenRefresh(
    `${API_URL}/astrology-insights/cosmic-weather/${userId}`,
    {
      method: 'POST',
      headers
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Could not generate cosmic weather');
  }
}

/**
 * Poll for cosmic weather until ready
 * Returns data when ready, throws error if timeout
 */
export async function pollForCosmicWeather(userId, token, maxPolls = 120, pollInterval = 1000) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  let pollCount = 0;

  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      pollCount++;

      try {
        const response = await fetchWithTokenRefresh(
          `${API_URL}/astrology-insights/cosmic-weather/${userId}`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          clearInterval(intervalId);
          resolve({
            text: data.weather || data.text || '',
            brief: data.brief || data.weather_brief || '',
            birthChart: data.birthChart,
            planets: data.currentPlanets || []
          });
          return;
        }
      } catch (err) {
        console.error('[COSMIC-WEATHER-API] Polling error:', err);
      }

      if (pollCount >= maxPolls) {
        clearInterval(intervalId);
        reject(new Error('Cosmic weather generation is taking longer than expected. Please try again.'));
      }
    }, pollInterval);
  });
}
