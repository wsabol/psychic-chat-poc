import { useCallback, useState } from 'react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

// ✅ Admin/dev emails - these users see the LANDING page after logout
const ADMIN_EMAILS = ['starshiptechnology1@gmail.com', 'wsabol39@gmail.com'];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Session and account management - temporary accounts, logout, etc.
 *
 * Free trial users are identified by a locally-generated UUID stored in
 * localStorage (key: 'guest_user_id'). No Firebase account is created,
 * mirroring the mobile app's local-guest-session approach.
 */
export function useAuthSession() {
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [isDevUserLogout, setIsDevUserLogout] = useState(false); // ✅ Track if dev user logged out

  /**
   * Start a free-trial guest session without creating a Firebase account.
   * Generates a temp_-prefixed UUID, persists it in localStorage, and
   * registers the session with the backend API.
   *
   * Accepts optional auth-state setters so the UI navigates to the chat page
   * immediately after session creation, without requiring a page refresh.
   */
  const createTemporaryAccount = useCallback(async (
    setLoading,
    setIsAuthenticated,
    setIsTemporaryAccount,
    setAuthUserId,
    setIsFirstTime
  ) => {
    try {
      if (setLoading) setLoading(true);

      // Reuse an existing guest session if one is already stored
      const existingGuestId = localStorage.getItem('guest_user_id');
      if (existingGuestId && existingGuestId.startsWith('temp_')) {
        // Session already saved in localStorage but auth state may not have
        // been updated yet (e.g. the previous onAuthStateChanged fired before
        // the key was written).  Drive state forward directly.
        if (setIsAuthenticated) {
          setAuthUserId?.(existingGuestId);
          setIsTemporaryAccount?.(true);
          setIsAuthenticated(true);
          setIsFirstTime?.(true);
        }
        return;
      }

      // Generate a locally-unique guest ID (no Firebase call needed)
      const uuid = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
      const guestUserId = `temp_${uuid}`;

      // Persist so the auth state listener can restore the session on reload
      localStorage.setItem('guest_user_id', guestUserId);

      // Register the session in the database (IP-based trial-limit check happens here).
      // Pass the language the user selected on the landing page so oracle_language and
      // language are set correctly from the very first message.
      const sessionLanguage = localStorage.getItem('temp_user_language')
        || localStorage.getItem('preferredLanguage')
        || 'en-US';
      const response = await fetch(`${API_URL}/free-trial/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempUserId: guestUserId, language: sessionLanguage })
      });

      let data;
      try { data = await response.json(); } catch (_) { data = {}; }

      if (!response.ok) {
        // Clean up on failure so the user isn't stuck with a broken local session
        localStorage.removeItem('guest_user_id');
        if (response.status === 429) {
          throw new Error(data?.error || 'Free trial already used from this device');
        }
        throw new Error(data?.error || 'Failed to create free trial session');
      }

      // ── Update auth state directly so the router navigates to the chat page
      // without requiring a page refresh.  onAuthStateChanged only fires on
      // Firebase auth events; it won't re-run just because we wrote to localStorage.
      if (setIsAuthenticated) {
        setAuthUserId?.(guestUserId);
        setIsTemporaryAccount?.(true);
        setIsAuthenticated(true);
        setIsFirstTime?.(true);
      }
    } catch (err) {
      logErrorFromCatch('[TEMP-ACCOUNT] Failed to create temporary account:', err);
      throw err;
    } finally {
      if (setLoading) setLoading(false);
    }
  }, []);

  /**
   * Clean up a guest session when the user exits or signs up.
   * Calls the unauthenticated cleanup endpoint (no Firebase token required)
   * and removes the guest ID from localStorage.
   */
  const deleteTemporaryAccount = useCallback(async (isTemporaryAccount) => {
    if (!isTemporaryAccount) return;
    try {
      const guestUserId = localStorage.getItem('guest_user_id');

      if (guestUserId && guestUserId.startsWith('temp_')) {
        // Best-effort server-side cleanup (no auth token required)
        try {
          await fetch(`${API_URL}/cleanup/delete-temp-account/${guestUserId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (_) {
          // Non-fatal — the server's tempAccountCleanupJob handles stragglers
        }
      }
    } catch (err) {
      logErrorFromCatch('[TEMP-ACCOUNT] Failed to delete temporary account:', err);
    } finally {
      // Always clear local state regardless of API result
      localStorage.removeItem('guest_user_id');
      localStorage.removeItem('temp_account_uid'); // legacy key
      localStorage.removeItem('temp_account_email'); // legacy key
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      // ✅ Check if current user is an admin before signing out
      const userEmail = auth.currentUser?.email || null;
      const userId = auth.currentUser?.uid || null;
      const isAdmin = ADMIN_EMAILS.includes(userEmail?.toLowerCase());
      setIsDevUserLogout(isAdmin);
      
      // ✅ CRITICAL FIX: Clear 2FA verification flag from sessionStorage
      // This ensures that on next login, 2FA check will be performed again
      if (userId) {
        sessionStorage.removeItem(`2fa_verified_${userId}`);
      }
      
      // Also clear all 2FA-related sessionStorage items as a safety measure
      for (let key in sessionStorage) {
        if (key && key.includes('2fa_verified')) {
          sessionStorage.removeItem(key);
        }
      }

      // ✅ CRITICAL FIX: Always clear stale guest session from localStorage.
      // Without this, a leftover guest_user_id from a previous free trial causes
      // onAuthStateChanged(null) to restore the temp account after ANY real-user logout,
      // routing back to the free trial chat instead of the landing page.
      localStorage.removeItem('guest_user_id');
      localStorage.removeItem('temp_account_uid');
      localStorage.removeItem('temp_account_email');
      
      await signOut(auth);
    } catch (err) {
      logErrorFromCatch('Logout error:', err);
    }
  }, []);

  const refreshEmailVerificationStatus = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        return auth.currentUser.emailVerified;
      }
    } catch (err) {
      logErrorFromCatch('[EMAIL-VERIFY-REFRESH] Error refreshing email status:', err);
    }
    return false;
  }, []);

  const exitApp = useCallback(async (isTemporaryAccount) => {
    // For temp accounts, try to delete, but always log out regardless
    if (isTemporaryAccount) {
      try {
        await deleteTemporaryAccount(isTemporaryAccount);
      } catch (err) {
      }
    }
    // Always sign out at the end
    await handleLogout();
  }, [deleteTemporaryAccount, handleLogout]);

  return {
    hasLoggedOut,
    setHasLoggedOut,
    isDevUserLogout,
    setIsDevUserLogout,
    createTemporaryAccount,
    deleteTemporaryAccount,
    handleLogout,
    refreshEmailVerificationStatus,
    exitApp,
  };
}

