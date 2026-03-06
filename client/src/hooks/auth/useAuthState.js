import { useEffect, useState, useCallback, useRef } from 'react';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { logErrorFromCatch, logWarning } from '../../shared/errorLogger.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Module-level deduplication guard
// ---------------------------------------------------------------------------
// useAuth() may be called in multiple components simultaneously (e.g.
// useAppState and useLanguagePreference), each creating its own
// onAuthStateChanged subscription.  Without this guard, every instance would
// concurrently hit /auth/check-2fa and trigger a separate 2FA email.
//
// IMPORTANT: The lock must be acquired BEFORE the very first `await` in the
// onAuthStateChanged callback — not merely before the `await fetch(check-2fa)`
// call.  The reason is that `await firebaseUser.reload()` (called during the
// email-verification step) causes Firebase to update the user's emailVerified
// flag, which can trigger a SECOND onAuthStateChanged callback.  That second
// instance starts while the first is suspended at the reload() await.  If the
// lock isn't set yet, the second instance bypasses the guard, claims the lock,
// completes the 2FA check, releases the lock, and then the first instance also
// claims the (now-released) lock and runs a second 2FA check.  On Edge this
// racing second state update can override the first and clear showTwoFactor,
// causing the 2FA screen to never appear even though the email was sent.
//
// The lock is cleared in a `finally` block that wraps the entire firebaseUser
// processing body, so subsequent legitimate logins (after sign-out) work.
// ---------------------------------------------------------------------------
const _pendingTwoFAChecks = new Set();

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

  // ── complete2FA ──────────────────────────────────────────────────────────
  // trustDevice: whether the user explicitly checked "Trust This Device" on the
  // 2FA screen.  Only call /auth/trust-admin-device when true — never auto-trust.
  const complete2FA = useCallback((userId, idToken, trustDevice = false) => {
    setShowTwoFactor(false);
    setTempToken(null);
    setTempUserId(null);
    setIsAuthenticated(true);

    // If admin completed 2FA from a new IP AND explicitly checked "Trust This Device",
    // record the IP as trusted so future logins from this device skip 2FA.
    const adminNewIP = sessionStorage.getItem('admin_new_ip');
    sessionStorage.removeItem('admin_new_ip'); // always clean up regardless
    if (adminNewIP && trustDevice) {
      try {
        const { browserInfo } = JSON.parse(adminNewIP);
        // Server detects the IP from req.ip — we just confirm 2FA passed and trust=true
        fetch(`${API_URL}/auth/trust-admin-device`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ browserInfo })
        }).catch(() => {});
      } catch (err) {
        // Trust device request is non-critical, silently handle error
      }
    }

    if (checkBillingStatus && !billingCheckedRef.current.has(userId)) {
      billingCheckedRef.current.add(userId);
      checkBillingStatus(idToken, userId);
    }
  }, [checkBillingStatus]);

  // ── Firebase auth listener ───────────────────────────────────────────────
  useEffect(() => {
    if (!checkBillingStatus) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // ── Deduplication guard — acquire BEFORE the first await ─────────
          // Must be synchronous so that a second onAuthStateChanged callback
          // triggered by firebaseUser.reload() (emailVerified false→true) sees
          // the lock and exits rather than racing the first instance to call
          // /auth/check-2fa.  The old placement (just before the check-2fa
          // fetch) left several await-gaps where a second callback on Edge
          // could bypass the guard and clear showTwoFactor via a stale update.
          if (_pendingTwoFAChecks.has(firebaseUser.uid)) {
            // A sibling hook instance is already processing this uid.
            // Let it drive auth state forward; we just clear loading.
            setLoading(false);
            return;
          }
          _pendingTwoFAChecks.add(firebaseUser.uid);

          try {
          const isTemp = firebaseUser.email.startsWith('temp_');
          let idToken = await firebaseUser.getIdToken();

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

            // Clean up any stale free-trial guest session.
            // When a guest user (guest_user_id in localStorage) clicks "Create Account",
            // signs in via Firebase, and becomes a permanent user, the guest_user_id entry
            // must be removed.  If it lingers, signing out later would re-hydrate the old
            // guest session (onAuthStateChanged fires with null → guest branch → sets
            // isTemporaryAccount=true again), which is incorrect.
            localStorage.removeItem('guest_user_id');

            // Track device on login (non-blocking) - server will detect IP via req.ip
            fetch(`${API_URL}/security/track-device/${firebaseUser.uid}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceName: navigator.userAgent || 'Unknown Device',
                ipAddress: 'auto-detect' // Backend detects from req.ip
              })
            }).catch(() => {});

            // Check email verification.
            // If emailVerified is false, auto-verify via the Admin SDK so the normal
            // 2FA flow runs instead of showing the Firebase link-click screen.
            // SendGrid 2FA is the sole identity verification step for new users.
            if (!firebaseUser.emailVerified) {
              let autoVerified = false;
              try {
                const markRes = await fetch(`${API_URL}/auth/mark-email-verified`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (markRes.ok) {
                  // Reload user object and force-refresh token so emailVerified:true
                  // is reflected in the Firebase client state and all subsequent calls.
                  await firebaseUser.reload();
                  idToken = await firebaseUser.getIdToken(true);
                  setToken(idToken);
                  setEmailVerified(firebaseUser.emailVerified);
                  autoVerified = firebaseUser.emailVerified;
                }
              } catch (markErr) {
                // Non-blocking — fall back gracefully on network error.
              }

              if (!autoVerified) {
                // FIXED: Do NOT return early and skip the 2FA check.
                // On Safari / Brave / Edge, the mark-email-verified request can
                // fail due to strict privacy settings or network conditions.
                // Previously this caused an early return that completely bypassed
                // the 2FA flow, so users never saw the code-entry screen.
                //
                // Instead: override emailVerified locally to true so the routing
                // layer doesn't redirect to the legacy link-click screen after
                // 2FA completes. Our 2FA code is sent to the email address, so
                // receiving it proves email access — equivalent to verification.
                setEmailVerified(true);
                // Fall through to the 2FA check below.
              }
              // autoVerified or locally-overridden: fall through to 2FA check.
            }

            // Log login to audit
            fetch(`${API_URL}/auth/log-login-success`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: firebaseUser.uid, email: firebaseUser.email })
            }).catch(() => {});

            // Check if 2FA was already verified in sessionStorage
            // (set by verify2FAHandler after the user enters the correct code).
            const twoFAVerifiedKey = `2fa_verified_${firebaseUser.uid}`;
            let alreadyVerified = sessionStorage.getItem(twoFAVerifiedKey);

            if (alreadyVerified) {
              setShowTwoFactor(false);
              setIsAuthenticated(true);
              if (!billingCheckedRef.current.has(firebaseUser.uid)) {
                billingCheckedRef.current.add(firebaseUser.uid);
                checkBillingStatus(idToken, firebaseUser.uid);
              }
              setLoading(false);
            } else {
              // Lock is already held (acquired at the very top of the handler,
              // before the first await).  Run the 2FA check directly.
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
          } finally {
            // Always release the lock — covers the temp-account early-return,
            // the alreadyVerified bypass, and the full 2FA check path.
            _pendingTwoFAChecks.delete(firebaseUser.uid);
          }
        } else {
          // ──────────────────────────────────────────────────────────────────
          // No Firebase user — check for a local guest session (free trial).
          // Guest sessions are identified by a temp_-prefixed UUID stored in
          // localStorage (created by useAuthSession.createTemporaryAccount).
          // This mirrors the mobile app's AsyncStorage-based guest approach;
          // no Firebase account is ever created for free-trial users.
          // ──────────────────────────────────────────────────────────────────
          const guestUserId = localStorage.getItem('guest_user_id');
          if (guestUserId && guestUserId.startsWith('temp_')) {
            setAuthUserId(guestUserId);
            setAuthEmail('');
            setToken(null); // No Firebase token for guest sessions
            setIsTemporaryAccount(true);
            setIsAuthenticated(true);
            setIsFirstTime(true);
            setEmailVerified(false);
            setIsEmailUser(false);
            setLoading(false);
            return;
          }

          setIsAuthenticated(false);
          setAuthUserId(null);
          setAuthEmail(null);
          setToken(null);
          setIsTemporaryAccount(false);
          setShowTwoFactor(false);
          setTempToken(null);
          setTempUserId(null);
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
