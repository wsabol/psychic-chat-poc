import { useState, useEffect } from 'react';

/**
 * Hook to fetch and manage horoscope user preferences
 */
export function useHoroscopePreferences(userId, token, apiUrl) {
  const [userPreference, setUserPreference] = useState('full');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showingBrief, setShowingBrief] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [userId, token, apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPreferences = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${apiUrl}/user-profile/${userId}/preferences`, { headers });

      if (response.ok) {
        const data = await response.json();
        const responseType = data.response_type || 'full';
        const voiceOn = data.voice_enabled !== false;

        setUserPreference(responseType);
        setVoiceEnabled(voiceOn);
        setShowingBrief(responseType === 'brief');

        console.log('[HOROSCOPE-PREFS] Loaded preferences:', { responseType, voiceOn });
      }
    } catch (err) {
      console.error('[HOROSCOPE-PREFS] Error fetching preferences:', err);
    }
  };

  return {
    userPreference,
    voiceEnabled,
    showingBrief,
    setShowingBrief
  };
}
