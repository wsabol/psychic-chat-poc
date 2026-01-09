import { useEffect, useCallback } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useAuth } from './useAuth';

/**
 * Hook to sync language preference with user database
 * 
 * CRITICAL FIX: When changing language, fetch current preferences first,
 * then send the full preference set to preserve response_type and voice_enabled
 */
export function useLanguagePreference() {
  const { changeLanguage, language } = useTranslation();
  const { authUserId, token } = useAuth();

  // Don't fetch automatically - language persists via localStorage in TranslationContext
  useEffect(() => {
    // Do nothing - TranslationContext handles language initialization
  }, [authUserId, token]);

  /**
   * Save language preference WITHOUT overwriting other settings
   * Fetch current preferences first, then update only the language
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
        
        // ✅ FIX: First fetch current preferences to preserve other settings
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
            console.log('[LANGUAGE] Fetched current preferences:', currentPrefs);
          }
        } catch (fetchErr) {
          console.warn('[LANGUAGE] Could not fetch current preferences, using defaults:', fetchErr.message);
        }

        // Now save with language update + all other preferences preserved
        const savePayload = {
          language: newLanguage,
          response_type: currentPrefs.response_type,
          voice_enabled: currentPrefs.voice_enabled,
          voice_selected: currentPrefs.voice_selected,
          oracle_language: currentPrefs.oracle_language
        };

        console.log('[LANGUAGE] Saving with payload:', savePayload);

        const response = await fetch(`${API_URL}/user-profile/${authUserId}/preferences`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(savePayload)
        });

        if (response.ok) {
          console.log(`[LANGUAGE] ✅ Language saved to DB: ${newLanguage}`);
          return true;
        } else {
          console.warn('[LANGUAGE] Failed to save language preference to DB');
          return true; // Still successful locally
        }
      } catch (err) {
        console.warn('[LANGUAGE] Error saving language preference:', err);
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
