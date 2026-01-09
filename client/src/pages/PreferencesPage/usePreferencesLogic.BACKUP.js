import { useState, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../../utils/fetchWithTokenRefresh';

/**
 * Hook for fetching and managing user preferences
 */
export const useFetchPreferences = (userId, token, API_URL) => {
  const [preferences, setPreferences] = useState({
    language: 'en-US',
    response_type: 'full',
    voice_enabled: true,
    voice_selected: 'sophia',
    oracle_language: 'en-US'
  });
  const [personalInfo, setPersonalInfo] = useState({ familiar_name: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        console.log('[PREFERENCES] No token available - using defaults');
        setLoading(false);
        return;
      }
      
      if (!userId) {
        console.log('[PREFERENCES] No userId available - using defaults');
        setLoading(false);
        return;
      }
      
      console.log('[PREFERENCES-FETCH] Fetching for userId:', userId, 'with token:', !!token);
      
      const headers = { 'Authorization': `Bearer ${token}` };

      const prefUrl = `${API_URL}/user-profile/${userId}/preferences`;
      console.log('[PREFERENCES-FETCH] Fetching from:', prefUrl);
      const prefResponse = await fetchWithTokenRefresh(prefUrl, { headers });
      
      if (!prefResponse.ok) {
        console.error('[PREFERENCES-FETCH] API returned status:', prefResponse.status);
        const errorText = await prefResponse.text();
        console.error('[PREFERENCES-FETCH] Error response:', errorText);
        throw new Error(`Failed to fetch preferences: ${prefResponse.status}`);
      }
      
      const prefData = await prefResponse.json();
      console.log('[PREFERENCES-FETCH] Data from API:', prefData);
      setPreferences({
        language: prefData.language || 'en-US',
        response_type: prefData.response_type || 'full',
        voice_enabled: prefData.voice_enabled !== false,
        voice_selected: prefData.voice_selected || 'sophia',
        oracle_language: prefData.oracle_language || 'en-US'
      });

      const personalResponse = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, { headers });
      if (personalResponse.ok) {
        const personalData = await personalResponse.json();
        setPersonalInfo({ familiar_name: personalData.address_preference || 'Friend' });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, token, API_URL]);

  return { preferences, setPreferences, personalInfo, loading, error };
};

/**
 * Hook for saving user preferences to the server
 */
export const useSavePreferences = (API_URL, userId, token, changeLanguage) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const save = async (preferences) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('[PREFERENCES-SAVE] Saving preferences:', preferences);
      
      // Update language in context if it changed (page UI language)
      if (preferences.language) {
        await changeLanguage(preferences.language);
      }
      // oracle_language is optional and independent of page language

      const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      console.log('[PREFERENCES-SAVE] Response status:', response.status);

      if (!response.ok) {
        const errData = await response.json();
        console.error('[PREFERENCES-SAVE] API error:', errData);
        throw new Error(errData.error || 'Failed to save preferences');
      }

      const data = await response.json();
      console.log('[PREFERENCES-SAVE] Response data:', data);
      setSuccess(true);
      
      return data.preferences;
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, error, success, setSuccess, setError };
};
