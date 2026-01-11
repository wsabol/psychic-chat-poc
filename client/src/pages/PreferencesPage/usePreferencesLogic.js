import { useState, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../../utils/fetchWithTokenRefresh';

/**
 * Hook for fetching and managing user preferences
 * FIXED: Better logging, localStorage cache, and proper error handling
 */
export const useFetchPreferences = (userId, token, API_URL) => {
  const [preferences, setPreferences] = useState(() => {
    // Try to load from localStorage first as fallback
    if (userId) {
      const cached = localStorage.getItem(`userPreferences_${userId}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('[PREFERENCES-FETCH] Failed to parse cached preferences');
        }
      }
    }
    return {
      language: 'en-US',
      response_type: 'full',
      voice_enabled: true,
      voice_selected: 'sophia',
      oracle_language: 'en-US'
    };
  });
  const [personalInfo, setPersonalInfo] = useState({ familiar_name: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      if (!userId) {
        setLoading(false);
        return;
      }
      
      const headers = { 'Authorization': `Bearer ${token}` };
      const prefUrl = `${API_URL}/user-profile/${userId}/preferences`;
      
      const prefResponse = await fetchWithTokenRefresh(prefUrl, { headers });
      
      
      if (!prefResponse.ok) {
        console.error('[PREFERENCES-FETCH] ❌ API error:', prefResponse.status);
        const errorText = await prefResponse.text();
        console.error('[PREFERENCES-FETCH] Error response:', errorText);
        throw new Error(`HTTP ${prefResponse.status}`);
      }
      
      const prefData = await prefResponse.json();
      
      const newPreferences = {
        language: prefData.language || 'en-US',
        response_type: prefData.response_type || 'full',
        voice_enabled: prefData.voice_enabled !== false,
        voice_selected: prefData.voice_selected || 'sophia',
        oracle_language: prefData.oracle_language || 'en-US'
      };
      
      setPreferences(newPreferences);
      
      // Cache in localStorage
      localStorage.setItem(`userPreferences_${userId}`, JSON.stringify(newPreferences));

      const personalResponse = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, { headers });
      if (personalResponse.ok) {
        const personalData = await personalResponse.json();
        setPersonalInfo({ familiar_name: personalData.address_preference || 'Friend' });
      }
    } catch (err) {
      console.error('[PREFERENCES-FETCH] ❌ Error:', err.message);
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
 * FIXED: Better logging and localStorage backup
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
      
      // Update language in context if it changed (page UI language)
      if (preferences.language) {
        await changeLanguage(preferences.language);
      }

      // Save to localStorage immediately as backup
      localStorage.setItem(`userPreferences_${userId}`, JSON.stringify(preferences));

      const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });


      if (!response.ok) {
        const errData = await response.json();
        console.error('[PREFERENCES-SAVE] ❌ API error:', errData);
        throw new Error(errData.error || 'Failed to save preferences');
      }

      const data = await response.json();
      setSuccess(true);
      
      return data.preferences;
    } catch (err) {
      console.error('[PREFERENCES-SAVE] ❌ Exception:', err.message);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, error, success, setSuccess, setError };
};

