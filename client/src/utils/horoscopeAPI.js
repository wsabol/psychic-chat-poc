import { fetchWithTokenRefresh } from './fetchWithTokenRefresh';
import { hashUserIdForUrl } from './userHashUtils';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * Fetch horoscope from API
 */
export async function fetchHoroscope(userId, range, token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const response = await fetchWithTokenRefresh(
    `${API_URL}/horoscope/${userId}/${range}`,
    { headers }
  );
  
  if (!response.ok) {
    return { ok: false, status: response.status, data: await response.json() };
  }

  const data = await response.json();
  return {
    ok: true,
    status: response.status,
    data: {
      text: data.horoscope,
      brief: data.brief,
      generatedAt: data.generated_at,
      range
    }
  };
}

/**
 * Request horoscope generation (synchronous - returns data immediately)
 */
export async function generateHoroscope(userId, range, token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const response = await fetchWithTokenRefresh(
    `${API_URL}/horoscope/${userId}/${range}`,
    { method: 'POST', headers }
  );
  
  if (!response.ok) {
    return { ok: false, status: response.status, data: await response.json() };
  }

  const data = await response.json();
  return {
    ok: true,
    status: response.status,
    data: {
      text: data.horoscope,
      brief: data.brief,
      generatedAt: data.generated_at,
      range
    }
  };
}

/**
 * Fetch user preferences
 */
export async function fetchUserPreferences(userId, token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const response = await fetch(`${API_URL}/user-profile/${userId}/preferences`, { headers });
  
  if (!response.ok) {
    return null;
  }

  return await response.json();
}

/**
 * Fetch astrology data
 */
export async function fetchAstrologyData(userId, token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const hashedUserId = await hashUserIdForUrl(userId);
  const response = await fetch(`${API_URL}/astrology/${hashedUserId}`, { headers });
  
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  let astroDataObj = data.astrology_data;
  
  if (typeof astroDataObj === 'string') {
    astroDataObj = JSON.parse(astroDataObj);
  }

  return {
    ...data,
    astrology_data: astroDataObj
  };
}
