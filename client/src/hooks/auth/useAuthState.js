import { useEffect, useState, useCallback } from 'react';
import { auth } from '../../firebase';
import { onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

/**
 * Core auth state management and Firebase listener
 */
export function useAuthState(checkBillingStatus) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTemporaryAccount, setIsTemporaryAccount] = useState(false);
  const [token, setToken] = useState(null);
  const [authUserId, setAuthUserId] = useState(null);
  const [authEmail, setAuthEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState('email');

  // Setup Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const isTemp = firebaseUser.email.startsWith('temp_');
          const idToken = await firebaseUser.getIdToken();

          // Check session persistence preference and set Firebase persistence
          if (!isTemp) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              
              const persistenceResponse = await fetch(`http://localhost:3000/security/2fa-settings/${firebaseUser.uid}`, {
                headers: { 'Authorization': `Bearer ${idToken}` },
                signal: controller.signal
              });

              clearTimeout(timeoutId);

              if (persistenceResponse.ok) {
                const persistenceData = await persistenceResponse.json();
                const persistentSession = persistenceData.settings?.persistent_session || false;

                // Set Firebase persistence based on user preference
                const persistence = persistentSession ? browserLocalPersistence : browserSessionPersistence;
                try {
                  await setPersistence(auth, persistence);
                } catch (err) {
                  console.warn('[AUTH-PERSISTENCE] Could not set persistence:', err.message);
                }
              }
            } catch (err) {
              // Silently ignore persistence errors - not critical, just log at debug level
              if (err.name === 'AbortError') {
                console.debug('[AUTH-PERSISTENCE] Settings fetch timed out (expected on slow networks)');
              } else {
                console.debug('[AUTH-PERSISTENCE] Settings fetch failed (non-critical):', err.message);
              }
            }
          }

          // Set auth state
          setAuthUserId(firebaseUser.uid);
          setAuthEmail(firebaseUser.email);
          setToken(idToken);
          setIsTemporaryAccount(isTemp);
          setEmailVerified(firebaseUser.emailVerified);
          const isEmail = firebaseUser.providerData.some(p => p.providerId === 'password');
          setIsEmailUser(isEmail);

          if (isTemp) {
            // Temporary accounts - authenticate immediately (no 2FA, no subscription/payment checks)
            setIsFirstTime(true);
            setIsAuthenticated(true);
            setLoading(false);
          } else {
            // Permanent accounts
            setIsFirstTime(false);
            localStorage.setItem('psychic_app_registered', 'true');

            // ✅ OPTION B: Skip 2FA if email NOT verified (brand new account)
            if (!firebaseUser.emailVerified) {
              setShowTwoFactor(false);
              setIsAuthenticated(true);
              // Check billing status (payment method then subscription) - SEQUENTIAL
              checkBillingStatus(idToken, firebaseUser.uid);
              setLoading(false);
              return;
            }

            // Email IS verified - existing user logging in

            // Log login to audit
            fetch('http://localhost:3000/auth/log-login-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: firebaseUser.uid, email: firebaseUser.email })
            }).catch(err => console.debug('[AUDIT] Login log skipped:', err.message));

            // Check if 2FA was already verified in THIS SESSION
            const twoFAVerifiedKey = `2fa_verified_${firebaseUser.uid}`;
            const alreadyVerified = sessionStorage.getItem(twoFAVerifiedKey);

            if (alreadyVerified) {
              setShowTwoFactor(false);
              setIsAuthenticated(true);
              // Check billing status sequentially
              checkBillingStatus(idToken, firebaseUser.uid);
              setLoading(false);
            } else {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const twoFAResponse = await fetch(`http://localhost:3000/auth/check-2fa/${firebaseUser.uid}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  signal: controller.signal
                });

                clearTimeout(timeoutId);
                const twoFAData = await twoFAResponse.json();

                if (twoFAData.requires2FA) {
                  // 2FA required - show 2FA screen, DON'T authenticate
                  setTempToken(twoFAData.tempToken);
                  setTempUserId(firebaseUser.uid);
                  setShowTwoFactor(true);
                  setTwoFactorMethod(twoFAData.method || 'email');
                  setIsAuthenticated(false);
                } else {
                  // No 2FA required - authenticate now
                  setShowTwoFactor(false);
                  setIsAuthenticated(true);
                  // Check billing status sequentially
                  checkBillingStatus(idToken, firebaseUser.uid);
                }
              } catch (err) {
                if (err.name === 'AbortError') {
                  console.debug('[2FA-CHECK] 2FA check timed out (expected on slow networks), proceeding with authentication');
                } else {
                  console.warn('[2FA-CHECK] Failed to check 2FA:', err.message);
                }
                setIsAuthenticated(true);
                // Still check billing status even if 2FA check fails
                checkBillingStatus(idToken, firebaseUser.uid);
              } finally {
                setLoading(false);
              }
            }
          }
        } else {
          setIsAuthenticated(false);
          setAuthUserId(null);
          setAuthEmail(null);
          setToken(null);
          setIsTemporaryAccount(false);
          setShowTwoFactor(false);
          setTempToken(null);
          setTempUserId(null);
          const hasRegistered = localStorage.getItem('psychic_app_registered');
          if (hasRegistered) {
            setIsFirstTime(false);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[AUTH-LISTENER] Error:', err);
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [checkBillingStatus]);

  const resetAuthState = useCallback(() => {
    setIsAuthenticated(false);
    setAuthUserId(null);
    setAuthEmail(null);
    setToken(null);
    setIsTemporaryAccount(false);
    setShowTwoFactor(false);
    setTempToken(null);
    setTempUserId(null);
  }, []);

  return {
    isAuthenticated,
    setIsAuthenticated,
    isTemporaryAccount,
    setIsTemporaryAccount,
    token,
    setToken,
    authUserId,
    setAuthUserId,
    authEmail,
    setAuthEmail,
    loading,
    setLoading,
    isFirstTime,
    setIsFirstTime,
    emailVerified,
    setEmailVerified,
    isEmailUser,
    setIsEmailUser,
    showTwoFactor,
    setShowTwoFactor,
    tempToken,
    setTempToken,
    tempUserId,
    setTempUserId,
    twoFactorMethod,
    setTwoFactorMethod,
    resetAuthState,
  };
}
