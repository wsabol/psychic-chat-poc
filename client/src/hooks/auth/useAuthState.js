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
  const [error, setError] = useState(null);
  
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
            // REMOVED: localStorage.setItem('psychic_app_registered', 'true');
            // Now using database-driven session management via /auth/check-returning-user
            
                        // Track device on login (non-blocking) - server will detect IP via req.ip
            fetch(`${API_URL}/security/track-device/${firebaseUser.uid}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceName: navigator.userAgent || 'Unknown Device',
                ipAddress: 'auto-detect' // Backend detects from req.ip
              })
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
                
                // SECURITY FIX: Don't bypass 2FA on network errors
                // If the 2FA check endpoint fails, we should NOT assume 2FA is not required
                // Instead, treat it as a temporary error and allow retry
                if (err.name === 'AbortError') {
                  // Timeout - allow user to retry login
                  logWarning('[AUTH-LISTENER] 2FA check timed out - please sign out and try again');
                  setError('Connection timeout. Please sign out and try again.');
                  setShowTwoFactor(false);
                  setIsAuthenticated(false);
                  setLoading(false);
                } else {
                  // Other network error - be lenient for users without 2FA enabled
                  // But log it as a security event
                  logWarning('[AUTH-LISTENER] 2FA check failed - assuming 2FA not required (may be security risk)');
                  console.warn('⚠️ SECURITY WARNING: 2FA check failed. If 2FA is enabled for this user, it was bypassed.');
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
          // REMOVED: localStorage check for 'psychic_app_registered'
          // Now using database-driven session management via /auth/check-returning-user
          // isFirstTime will be determined by sessionCheckData in useAppRouting
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
