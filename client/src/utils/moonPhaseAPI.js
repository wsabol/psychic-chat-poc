import { fetchWithTokenRefresh } from './fetchWithTokenRefresh';
import { fetchUserPreferences, fetchAstrologyData } from './horoscopeAPI';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * Fetch moon phase commentary
 */
export async function fetchMoonPhase(userId, phase, token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const response = await fetchWithTokenRefresh(
    `${API_URL}/moon-phase/${userId}?phase=${phase}`,
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
      text: data.commentary,
      brief: data.brief,
      generatedAt: data.generated_at,
      phase
    }
  };
}

/**
 * Generate moon phase commentary
 * SYNCHRONOUS: Returns data immediately from POST response
 */
export async function generateMoonPhase(userId, phase, token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const response = await fetchWithTokenRefresh(
    `${API_URL}/moon-phase/${userId}`,
    { 
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase })
    }
  );
  
  if (!response.ok) {
    return { ok: false, status: response.status, data: await response.json() };
  }

  const data = await response.json();
  return {
    ok: true,
    status: response.status,
    data: {
      text: data.commentary,
      brief: data.brief,
      generatedAt: data.generated_at,
      phase: data.phase
    }
  };
}

// Re-export shared API functions
export { fetchUserPreferences, fetchAstrologyData };
