import { useEffect, useState, useCallback, useRef } from 'react';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { logErrorFromCatch, logWarning } from '../../shared/errorLogger.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

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
            // TEMPORARY ACCOUNTS: Skip billing checks, go straight to authenticated
            setIsFirstTime(true);
            setIsAuthenticated(true);
            setLoading(false);
            // Don't call checkBillingStatus for temporary accounts
            return;
          } else {
            setIsFirstTime(false);
            localStorage.setItem('psychic_app_registered', 'true');
            
            // Track device on login (non-blocking) - server will detect IP via req.ip
            fetch(`${API_URL}/security/track-device/${firebaseUser.uid}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            }).catch(() => {});

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
            fetch(`${API_URL}/auth/log-login-success`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: firebaseUser.uid, email: firebaseUser.email })
            }).catch(() => {});

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
                                // Browser info for device tracking (IP detected server-side to avoid CORS issues)
                const browserInfo = navigator.userAgent.split(' ').slice(-2).join(' ');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                
                // Server will detect IP from request headers (req.ip) to avoid CORS issues with ipapi.co
                const twoFAResponse = await fetch(`${API_URL}/auth/check-2fa/${firebaseUser.uid}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ browserInfo }),
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
                  
                   // Store browser info for after 2FA (server detects IP/device via req.ip and UAParser)
                  if (twoFAData.isAdminNewIP) {
                    sessionStorage.setItem('admin_new_ip', JSON.stringify({
                      browserInfo
                    }));
                  }
                  
                  setLoading(false);
                } else {
                  // 2FA not required - proceed to authentication
                  setShowTwoFactor(false);
                  setIsAuthenticated(true);
                  if (!billingCheckedRef.current.has(firebaseUser.uid)) {
                    billingCheckedRef.current.add(firebaseUser.uid);
                    checkBillingStatus(idToken, firebaseUser.uid);
                  }
                  setLoading(false);
                }
              } catch (err) {
                logErrorFromCatch('[AUTH-LISTENER] /auth/check-2fa FAILED:', err.message, err.name);
                
                // CRITICAL: If 2FA check fails for any reason (timeout, network error, etc),
                // assume 2FA is NOT required. This prevents users from being stuck at login
                // when the API is slow or 2FA is disabled. The endpoint should return
                // requires2FA: false by default for users without 2FA enabled.
                logWarning('[AUTH-LISTENER] 2FA check failed - assuming 2FA not required');
                setShowTwoFactor(false);
                setIsAuthenticated(true);
                if (!billingCheckedRef.current.has(firebaseUser.uid)) {
                  billingCheckedRef.current.add(firebaseUser.uid);
                  checkBillingStatus(idToken, firebaseUser.uid);
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
        logErrorFromCatch('[AUTH-LISTENER] FATAL ERROR:', err);
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
    
    // If admin completed 2FA from new IP, trust the device
        const adminNewIP = sessionStorage.getItem('admin_new_ip');
    if (adminNewIP) {
      try {
        const { browserInfo } = JSON.parse(adminNewIP);
        // Server detected IP/device, just confirm 2FA passed
        fetch(`${API_URL}/auth/trust-admin-device`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
                    body: JSON.stringify({ browserInfo })
        }).catch(() => {});
        sessionStorage.removeItem('admin_new_ip');
            } catch (err) {
        // Trust device request is non-critical, silently handle error
      }
    }
    
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
