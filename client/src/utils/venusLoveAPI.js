import { fetchWithTokenRefresh } from './fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Fetch an existing Venus Love Profile (generates on-demand if none cached).
 */
export async function fetchVenusLoveProfile(userId, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetchWithTokenRefresh(
    `${API_URL}/astrology-insights/venus-love-profile/${userId}`,
    { headers }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Force-regenerate the Venus Love Profile (e.g. user clicks "Refresh").
 */
export async function generateVenusLoveProfile(userId, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetchWithTokenRefresh(
    `${API_URL}/astrology-insights/venus-love-profile/${userId}`,
    { method: 'POST', headers }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Could not generate Venus Love Profile');
  }

  return await response.json();
}
