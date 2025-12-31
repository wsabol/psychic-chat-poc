import { useEffect, useCallback } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useAuth } from './useAuth';

/**
 * Hook to sync language preference with user database
 * 
 * Responsibilities:
 * 1. Fetch user's language preference from DB on mount
 * 2. Save language changes to DB when authenticated
 * 3. Handle API errors gracefully (don't break app)
 */
export function useLanguagePreference() {
  const { changeLanguage, language } = useTranslation();
  const { authUserId, token } = useAuth();

  // Fetch user language preference from DB on mount or auth change
  // Only refetch when authUserId or token changes, NOT when changeLanguage changes
  useEffect(() => {
    // Don't fetch language preference during app initialization
  // It causes race conditions and blocks the app if the API is slow
  // Language is managed by TranslationContext and user can change it in Settings
  }, [authUserId, token]); // ✅ FIXED: Removed changeLanguage to prevent infinite loop

  // Save language change to DB
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
        const response = await fetch(`${API_URL}/user-profile/${authUserId}/preferences`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            language: newLanguage,
            // Keep existing preferences
            response_type: 'full',
            voice_enabled: true
          })
        });

        if (response.ok) {
          console.log(`[LANGUAGE] Language saved to DB: ${newLanguage}`);
          return true;
        } else {
          console.warn('[LANGUAGE] Failed to save language preference to DB');
          // Still successful locally though
          return true;
        }
      } catch (err) {
        console.warn('[LANGUAGE] Error saving language preference:', err);
        // Still successful locally, just failed to persist to DB
        return true;
      }
    }

    return true;
  }, [authUserId, token, changeLanguage]);

  return {
    saveLanguagePreference,
    currentLanguage: language
  };
}
