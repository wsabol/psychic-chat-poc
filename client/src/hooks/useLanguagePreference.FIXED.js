import { useEffect, useCallback } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useAuth } from './useAuth';

/**
 * Hook to sync language preference with user database
 * 
 * CRITICAL FIX: Do NOT hardcode response_type and voice_enabled
 * These should be saved by PreferencesPage.save() not by this hook
 * 
 * This hook ONLY manages language preference, not other preferences
 */
export function useLanguagePreference() {
  const { changeLanguage, language } = useTranslation();
  const { authUserId, token } = useAuth();

  // Don't fetch automatically - language persists via localStorage in TranslationContext
  useEffect(() => {
    // Do nothing - TranslationContext handles language initialization
  }, [authUserId, token]);

  /**
   * Save ONLY language preference (NOT response_type, voice_enabled, etc)
   * Other preferences are managed by PreferencesPage
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
        
        // ✅ FIX: Only send language, let the API preserve other preferences
        const response = await fetch(`${API_URL}/user-profile/${authUserId}/preferences`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            language: newLanguage
            // DO NOT include response_type, voice_enabled, oracle_language
            // Let the API preserve existing values for these fields
          })
        });

        if (response.ok) {
          console.log(`[LANGUAGE] Language saved to DB: ${newLanguage}`);
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
