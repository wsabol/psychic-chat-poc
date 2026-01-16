import { useState, useEffect } from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * Custom hook to fetch user preferences (response type, voice enabled)
 */
export function useUserPreferences(userId, token) {
  const [userPreference, setUserPreference] = useState('full');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showingBrief, setShowingBrief] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/user-profile/${userId}/preferences`, { headers });
        
        if (response.ok) {
          const data = await response.json();
          const preference = data.response_type || 'full';
          const enabled = data.voice_enabled !== false;
          
          setUserPreference(preference);
          setVoiceEnabled(enabled);
          setShowingBrief(preference === 'brief');
        }
      } catch (err) {
        logErrorFromCatch('[USER-PREFERENCES-HOOK] Error fetching preferences:', err);
      }
    };

    fetchPreferences();
  }, [userId, token]);

  return {
    userPreference,
    voiceEnabled,
    showingBrief,
    setShowingBrief
  };
}
