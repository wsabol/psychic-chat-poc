import { useState, useCallback } from 'react';
import { fetchVenusLoveProfile, generateVenusLoveProfile } from '../utils/venusLoveAPI';

/**
 * Hook: useVenusLoveData
 *
 * Manages loading / generating the Venus Love Profile.
 * On first call `load()` hits GET (which auto-generates on the API side if needed).
 * `refresh()` hits POST to force a fresh generation.
 */
export function useVenusLoveData(userId, token, isAuthenticated) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVenusLoveProfile(userId, token);
      setProfileData(data);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('birth') || msg.toLowerCase().includes('personal')) {
        setError('BIRTH_INFO_MISSING');
      } else {
        setError(msg || 'Failed to load Venus Love Profile');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, token, isAuthenticated]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !userId) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await generateVenusLoveProfile(userId, token);
      setProfileData(data);
    } catch (err) {
      setError(err.message || 'Failed to refresh Venus Love Profile');
    } finally {
      setGenerating(false);
    }
  }, [userId, token, isAuthenticated]);

  return { profileData, loading, generating, error, load, refresh };
}
