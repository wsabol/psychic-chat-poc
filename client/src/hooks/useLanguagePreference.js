import { useEffect, useCallback } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useAuth } from './useAuth';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * sessionStorage key used to carry a language selection made on the
 * login / register page (before the user is authenticated) forward
 * into the first authenticated request so it can be persisted to DB.
 */
const PENDING_LANGUAGE_KEY = 'pendingLanguageSave';

/**
 * Hook to sync language preference with user database
 *
 * Behaviour:
 * - While UNAUTHENTICATED (login / register pages): language changes are
 *   applied locally AND stored in sessionStorage as a "pending" preference.
 * - When the user AUTHENTICATES (login or new registration):
 *   1. If a pending language is found in sessionStorage it is saved to the
 *      database immediately (user's latest explicit choice wins).
 *   2. If no pending language exists, the language stored in the database is
 *      fetched and applied (restoring the user's previously saved preference).
 */
export function useLanguagePreference() {
  const { changeLanguage, language } = useTranslation();
  const { authUserId, token } = useAuth();

  // ✅ CRITICAL: Sync language preference with database when user authenticates
  useEffect(() => {
    if (!authUserId || !token) {
      return;
    }

    const syncLanguagePreference = async () => {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

      // ── Step 1: check for a language chosen on the login / register page ──
      // If the user selected a language BEFORE logging in or registering, we
      // honour that choice by saving it to the database right away instead of
      // overwriting it with whatever was previously stored in the DB.
      const pendingLanguage = sessionStorage.getItem(PENDING_LANGUAGE_KEY);

      if (pendingLanguage) {
        // Clear the pending key immediately so it is never applied twice
        sessionStorage.removeItem(PENDING_LANGUAGE_KEY);

        try {
          // Fetch current preferences so we preserve unrelated settings
          let currentPrefs = {
            response_type: 'full',
            voice_enabled: true,
            voice_selected: 'sophia',
            oracle_language: pendingLanguage
          };

          try {
            const fetchResponse = await fetch(
              `${API_URL}/user-profile/${authUserId}/preferences`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            if (fetchResponse.ok) {
              const data = await fetchResponse.json();
              currentPrefs = {
                response_type: data.response_type || 'full',
                voice_enabled: data.voice_enabled !== false,
                voice_selected: data.voice_selected || 'sophia',
                // Keep existing oracle_language; it will be synced below
                oracle_language: data.oracle_language || pendingLanguage
              };
            }
          } catch (fetchErr) {
            // Non-fatal – continue with defaults
          }

          // Save the pending language (and sync oracle_language) to DB
          await fetch(`${API_URL}/user-profile/${authUserId}/preferences`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              language: pendingLanguage,
              response_type: currentPrefs.response_type,
              voice_enabled: currentPrefs.voice_enabled,
              voice_selected: currentPrefs.voice_selected,
              oracle_language: pendingLanguage // keep UI & oracle in sync
            })
          });

          // Ensure local state reflects the saved language
          await changeLanguage(pendingLanguage);
        } catch (err) {
          logErrorFromCatch('[LANGUAGE-PREF] Error saving pending language preference:', err);
          // Fail silently – the language is already applied locally
        }

        // We handled the pending preference; nothing more to do
        return;
      }

      // ── Step 2: no pending language – fetch the stored DB preference ──
      try {
        const response = await fetch(
          `${API_URL}/user-profile/${authUserId}/preferences`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        // Apply the language from database (only on initial auth load)
        if (data.language) {
          await changeLanguage(data.language);
        }
      } catch (err) {
        logErrorFromCatch('[LANGUAGE-PREF] Error fetching preferences:', err);
        // Fail silently – use whatever language is already set
      }
    };

    syncLanguagePreference();
  }, [authUserId, token, changeLanguage]);

  /**
   * Save language preference.
   *
   * - Always applies the change locally (fast UI feedback).
   * - If AUTHENTICATED: saves to the database immediately.
   * - If UNAUTHENTICATED (login / register page): stores the selection in
   *   sessionStorage so it can be persisted the moment the user logs in or
   *   completes registration.
   */
  const saveLanguagePreference = useCallback(async (newLanguage) => {
    // Always change locally first for immediate feedback
    const success = await changeLanguage(newLanguage);

    if (!success) {
      return false;
    }

    // ── Unauthenticated path ──────────────────────────────────────────────
    // Store as a pending preference so it is saved to DB after auth
    if (!authUserId || !token) {
      sessionStorage.setItem(PENDING_LANGUAGE_KEY, newLanguage);
      return true;
    }

    // ── Authenticated path ────────────────────────────────────────────────
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
        const fetchResponse = await fetch(
          `${API_URL}/user-profile/${authUserId}/preferences`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          currentPrefs = {
            response_type: data.response_type || 'full',
            voice_enabled: data.voice_enabled !== false,
            voice_selected: data.voice_selected || 'sophia',
            oracle_language: data.oracle_language || 'en-US'
          };
        }
      } catch (fetchErr) {
        // Non-fatal
      }

      // Save with language update + all other preferences preserved.
      // CRITICAL: oracle_language is synced to newLanguage so the oracle (AI)
      // responds in the user's preferred language.  Users who want a different
      // oracle language can override it independently in PreferencesPage.
      const savePayload = {
        language: newLanguage,
        response_type: currentPrefs.response_type,
        voice_enabled: currentPrefs.voice_enabled,
        voice_selected: currentPrefs.voice_selected,
        oracle_language: newLanguage
      };

      await fetch(`${API_URL}/user-profile/${authUserId}/preferences`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(savePayload)
      });

      return true;
    } catch (err) {
      return true; // Still successful locally
    }
  }, [authUserId, token, changeLanguage]);

  return {
    saveLanguagePreference,
    currentLanguage: language
  };
}
