import { useEffect, useState, useCallback, useRef } from 'react';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Core auth state management and Firebase listener
 * WITH DEBUG LOGGING
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
  
  const billingCheckedRef = useRef(new Set());

  // Setup Firebase auth listener
  useEffect(() => {
    if (!checkBillingStatus) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const isTemp = firebaseUser.email.startsWith('temp_');
          const idToken = await firebaseUser.getIdToken();

          // Set auth state
          setAuthUserId(firebaseUser.uid);
          setAuthEmail(firebaseUser.email);
          setToken(idToken);
          setIsTemporaryAccount(isTemp);
          setEmailVerified(firebaseUser.emailVerified);
          const isEmail = firebaseUser.providerData.some(p => p.providerId === 'password');
          setIsEmailUser(isEmail);

          if (isTemp) {
            setIsFirstTime(true);
            setIsAuthenticated(true);
            setLoading(false);
          } else {
            setIsFirstTime(false);
            localStorage.setItem('psychic_app_registered', 'true');
            
            // Track device on login (non-blocking)
            (async () => {
              try {
                let deviceName = 'Unknown Device', ipAddress = 'unknown';
                try {
                  const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
                  ipAddress = geo.ip || 'unknown';
                  deviceName = geo.city && geo.country_name ? `${geo.city}, ${geo.country_name}` : (geo.country_name || deviceName);
                } catch (e) { }
                fetch(`http://localhost:3000/security/track-device/${firebaseUser.uid}`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ deviceName, ipAddress })
                }).catch(() => {});
              } catch (e) { }
            })();

            // Check email verification
            if (!firebaseUser.emailVerified) {
              setShowTwoFactor(false);
              setIsAuthenticated(true);
              if (!billingCheckedRef.current.has(firebaseUser.uid)) {
                billingCheckedRef.current.add(firebaseUser.uid);
                checkBillingStatus(idToken, firebaseUser.uid);
              }
              setLoading(false);
              return;
            }

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
              if (!billingCheckedRef.current.has(firebaseUser.uid)) {
                billingCheckedRef.current.add(firebaseUser.uid);
                checkBillingStatus(idToken, firebaseUser.uid);
              }
              setLoading(false);
            } else {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                
                const twoFAResponse = await fetch(`http://localhost:3000/auth/check-2fa/${firebaseUser.uid}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  signal: controller.signal
                });

                clearTimeout(timeoutId);
                const twoFAData = await twoFAResponse.json();

                if (twoFAData.requires2FA) {
                  setTempToken(twoFAData.tempToken);
                  setTempUserId(firebaseUser.uid);
                  setShowTwoFactor(true);
                  setTwoFactorMethod(twoFAData.method || 'email');
                  setIsAuthenticated(false);
                  setLoading(false);
                } else {
                  setShowTwoFactor(false);
                  setIsAuthenticated(true);
                  if (!billingCheckedRef.current.has(firebaseUser.uid)) {
                    billingCheckedRef.current.add(firebaseUser.uid);
                    checkBillingStatus(idToken, firebaseUser.uid);
                  }
                  setLoading(false);
                }
              } catch (err) {
                console.error('[AUTH-LISTENER] /auth/check-2fa FAILED:', err.message, err.name);
                
                if (err.name === 'AbortError') {
                  setShowTwoFactor(true);
                  setIsAuthenticated(false);
                } else {
                  console.error('[AUTH-LISTENER] 2FA check error - keeping unauthenticated');
                  setShowTwoFactor(false);
                  setIsAuthenticated(false);
                }
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
        console.error('[AUTH-LISTENER] FATAL ERROR:', err);
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [checkBillingStatus]);

  const complete2FA = useCallback((userId, idToken) => {
    setShowTwoFactor(false);
    setTempToken(null);
    setTempUserId(null);
    setIsAuthenticated(true);
    
    if (checkBillingStatus && !billingCheckedRef.current.has(userId)) {
      billingCheckedRef.current.add(userId);
      checkBillingStatus(idToken, userId);
    }
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
    billingCheckedRef.current.clear();
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
    complete2FA,
  };
}


