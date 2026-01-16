import { useCallback, useState } from 'react';
import { auth } from '../../firebase';
import { signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

// ✅ Set your dev email here for developer testing
const DEV_EMAIL = 'starshiptechnology1@gmail.com';

/**
 * Session and account management - temporary accounts, logout, etc.
 */
export function useAuthSession() {
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [isDevUserLogout, setIsDevUserLogout] = useState(false); // ✅ NEW: Track if dev user logged out

  const createTemporaryAccount = useCallback(async (setLoading) => {
    try {
      if (setLoading) setLoading(true);
      const uuid = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
      const tempEmail = `temp_${uuid}@psychic.local`;
      const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);

      localStorage.setItem('temp_account_uid', userCredential.user.uid);
      localStorage.setItem('temp_account_email', tempEmail);
      sessionStorage.setItem('temp_user_id', userCredential.user.uid);
    } catch (err) {
      logErrorFromCatch('[TEMP-ACCOUNT] Failed to create temporary account:', err);
      throw err;
    } finally {
      if (setLoading) setLoading(false);
    }
  }, []);

  const deleteTemporaryAccount = useCallback(async (isTemporaryAccount) => {
    try {
      if (isTemporaryAccount && auth.currentUser) {
        const uid = auth.currentUser.uid;

        let userToken = null;

        try {
          userToken = await auth.currentUser.getIdToken();
        } catch (err) {
        }

        // Call backend to delete from database and Firebase
        if (userToken) {
          try {
            const deleteUrl = 'http://localhost:3000/cleanup/delete-temp-account/' + uid;
            const response = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${userToken}` }
            });

            if (response.ok) {
              // Success
            } else {
              logErrorFromCatch('[TEMP-ACCOUNT] Backend deletion failed:', response.status);
            }
          } catch (err) {
          }
        }

        // Also try to delete from Firebase client-side
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            await currentUser.delete();
          }
        } catch (err) {
        }

        // Clean up localStorage
        localStorage.removeItem('temp_account_uid');
        localStorage.removeItem('temp_account_email');
      }
    } catch (err) {
      logErrorFromCatch('[TEMP-ACCOUNT] Failed to delete temporary account:', err);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      // ✅ Check if current user is the dev user before signing out
      const userEmail = auth.currentUser?.email || null;
      const userId = auth.currentUser?.uid || null;
      const isDev = userEmail === DEV_EMAIL;
      setIsDevUserLogout(isDev);
      
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

