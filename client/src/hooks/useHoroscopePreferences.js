import { useState, useEffect } from 'react';

/**
 * Hook to fetch and manage horoscope user preferences
 * 
 * FIXED: Added better logging and localStorage fallback
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
      console.log('[HOROSCOPE-PREFS] Fetching for userId:', userId, 'with token:', !!token);
      
      if (!userId || !token) {
        console.log('[HOROSCOPE-PREFS] Missing userId or token, checking localStorage');
        // Try to load from localStorage as fallback
        const cached = localStorage.getItem(`horoscope_prefs_${userId}`);
        if (cached) {
          const prefs = JSON.parse(cached);
          console.log('[HOROSCOPE-PREFS] Loaded from localStorage:', prefs);
          setUserPreference(prefs.responseType);
          setVoiceEnabled(prefs.voiceOn);
          setShowingBrief(prefs.responseType === 'brief');
        }
        return;
      }

      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const url = `${apiUrl}/user-profile/${userId}/preferences`;
      console.log('[HOROSCOPE-PREFS] Fetching from:', url);
      
      const response = await fetch(url, { headers });
      console.log('[HOROSCOPE-PREFS] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[HOROSCOPE-PREFS] Response data:', data);
        
        const responseType = data.response_type || 'full';
        const voiceOn = data.voice_enabled !== false;

        setUserPreference(responseType);
        setVoiceEnabled(voiceOn);
        setShowingBrief(responseType === 'brief');

        // Cache in localStorage for fallback
        localStorage.setItem(`horoscope_prefs_${userId}`, JSON.stringify({
          responseType,
          voiceOn,
          timestamp: Date.now()
        }));

        console.log('[HOROSCOPE-PREFS] ✅ Loaded and cached preferences:', { responseType, voiceOn });
      } else {
        console.warn('[HOROSCOPE-PREFS] API returned status', response.status);
        // Try localStorage fallback
        const cached = localStorage.getItem(`horoscope_prefs_${userId}`);
        if (cached) {
          const prefs = JSON.parse(cached);
          console.log('[HOROSCOPE-PREFS] Using cached fallback:', prefs);
          setUserPreference(prefs.responseType);
          setVoiceEnabled(prefs.voiceOn);
          setShowingBrief(prefs.responseType === 'brief');
        }
      }
    } catch (err) {
      console.error('[HOROSCOPE-PREFS] Error fetching preferences:', err);
      // Try localStorage fallback
      const cached = localStorage.getItem(`horoscope_prefs_${userId}`);
      if (cached) {
        const prefs = JSON.parse(cached);
        console.log('[HOROSCOPE-PREFS] Error occurred, using cached fallback:', prefs);
        setUserPreference(prefs.responseType);
        setVoiceEnabled(prefs.voiceOn);
        setShowingBrief(prefs.responseType === 'brief');
      }
    }
  };

  return {
    userPreference,
    voiceEnabled,
    showingBrief,
    setShowingBrief
  };
}
