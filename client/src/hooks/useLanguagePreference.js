import { useEffect, useCallback } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useAuth } from './useAuth';

/**
 * Hook to sync language preference with user database
 * 
 * PROPER FIX: Fetch user preferences from database when authenticated
 * This ensures preferences persist across login/logout cycles
 */
export function useLanguagePreference() {
  const { changeLanguage, language } = useTranslation();
  const { authUserId, token } = useAuth();

  // ✅ CRITICAL: Fetch preferences from database when user authenticates
  useEffect(() => {
    if (!authUserId || !token) {
      console.log('[LANGUAGE-PREF] No auth - skipping fetch');
      return;
    }

    const fetchAndApplyPreferences = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        console.log('[LANGUAGE-PREF] Fetching preferences for userId:', authUserId);

        const response = await fetch(`${API_URL}/user-profile/${authUserId}/preferences`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn('[LANGUAGE-PREF] Failed to fetch preferences:', response.status);
          return;
        }

        const data = await response.json();
        console.log('[LANGUAGE-PREF] Fetched from DB:', data);

        // Apply the language from database (only on initial load)
        if (data.language) {
          console.log('[LANGUAGE-PREF] Applying language from DB:', data.language);
          await changeLanguage(data.language);
        }
      } catch (err) {
        console.error('[LANGUAGE-PREF] Error fetching preferences:', err);
        // Fail silently - use whatever language is already set
      }
    };

    fetchAndApplyPreferences();
  }, [authUserId, token, changeLanguage]);

  /**
   * Save language preference with all other preferences preserved
   */
  const saveLanguagePreference = useCallback(async (newLanguage) => {
    // Always change locally first
    const success = await changeLanguage(newLanguage);
    
    if (!success) {
      return false;
    }

    // Then save to DB if authenticated
    if (authUserId && token) {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        
        // First fetch current preferences to preserve other settings
        let currentPrefs = {
          response_type: 'full',
          voice_enabled: true,
          voice_selected: 'sophia',
          oracle_language: 'en-US'
        };

        try {
          const fetchResponse = await fetch(`${API_URL}/user-profile/${authUserId}/preferences`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            currentPrefs = {
              response_type: data.response_type || 'full',
              voice_enabled: data.voice_enabled !== false,
              voice_selected: data.voice_selected || 'sophia',
              oracle_language: data.oracle_language || 'en-US'
            };
            console.log('[LANGUAGE-PREF] Fetched current preferences:', currentPrefs);
          }
        } catch (fetchErr) {
          console.warn('[LANGUAGE-PREF] Could not fetch current preferences:', fetchErr.message);
        }

        // Now save with language update + all other preferences preserved
        const savePayload = {
          language: newLanguage,
          response_type: currentPrefs.response_type,
          voice_enabled: currentPrefs.voice_enabled,
          voice_selected: currentPrefs.voice_selected,
          oracle_language: currentPrefs.oracle_language
        };

        console.log('[LANGUAGE-PREF] Saving with payload:', savePayload);

        const response = await fetch(`${API_URL}/user-profile/${authUserId}/preferences`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(savePayload)
        });

        if (response.ok) {
          console.log(`[LANGUAGE-PREF] ✅ Language saved to DB: ${newLanguage}`);
          return true;
        } else {
          console.warn('[LANGUAGE-PREF] Failed to save language preference to DB');
          return true; // Still successful locally
        }
      } catch (err) {
        console.warn('[LANGUAGE-PREF] Error saving language preference:', err);
        return true; // Still successful locally
      }
    }

    return true;
  }, [authUserId, token, changeLanguage]);

  return {
    saveLanguagePreference,
    currentLanguage: language
  };
}
