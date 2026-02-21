import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { saveUserTimezone } from '../utils/timezoneUtils';
import { logErrorFromCatch } from '../shared/errorLogger.js';

// ─── Module-level flag ────────────────────────────────────────────────────────
// Tracks whether the FIRST onAuthStateChanged call has been processed.
// On page load, Firebase fires onAuthStateChanged once with the stored session.
// That is the only time we enforce the "persistent_session" preference check.
// Subsequent calls (explicit login, token refresh) skip the check so a user
// is never accidentally signed out immediately after logging in.
// This flag resets to true on every full page load / app restart.
let _isFirstAuthStateChange = true;

// Client-side error logging helper (non-critical, for debugging)
function logClientError(context, error) {
  if (process.env.NODE_ENV === 'development') {
    logErrorFromCatch(`[${context}]`, error);
  }
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tokenRefreshIntervalRef = useRef(null);

  // Function to refresh token
  const refreshToken = async (firebaseUser) => {
    try {
      if (firebaseUser) {
        const newToken = await firebaseUser.getIdToken(true); // force refresh
        setUser(prev => prev ? { ...prev, token: newToken } : null);
      }
    } catch (err) {
      logClientError('AUTH', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Capture and immediately reset the "first call" flag.
      // We only enforce the persistent-session check on the very first
      // onAuthStateChanged event (page load with a stored Firebase session).
      const isPageLoad = _isFirstAuthStateChange;
      _isFirstAuthStateChange = false;

      try {
        if (firebaseUser) {
          
          // Get ID token
          const token = await firebaseUser.getIdToken();

          // ── Active Sessions check (page-load only) ───────────────────────
          // On page load Firebase automatically restores the stored session.
          // If the user has turned off "Stay Logged In", sign them out now so
          // they are required to log in again.  We only run this on the first
          // onAuthStateChanged event so an explicit login is never rejected.
          if (isPageLoad && !firebaseUser.isAnonymous) {
            try {
              const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
              const prefRes = await fetch(
                `${API_URL}/security/session-preference/${firebaseUser.uid}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (prefRes.ok) {
                const prefData = await prefRes.json();
                // persistent_session === false → user explicitly disabled it.
                // null or true → "stay logged in" (default or explicitly enabled).
                if (prefData.persistent_session === false) {
                  await signOut(auth);
                  // onAuthStateChanged will fire again with null — state clears there.
                  return;
                }
              }
            } catch (sessionErr) {
              // Non-fatal: network error or API down — default to staying logged in.
              logClientError('AUTH-SESSION-PREF', sessionErr);
            }
          }

          // Check if user has accepted consent
          let consentStatus = {
            hasConsent: false,
            terms_accepted: false,
            privacy_accepted: false
          };
          
          // Check for pending consent from social provider registration
          const pendingConsentStr = sessionStorage.getItem('pendingConsent');
          let pendingConsent = null;
          if (pendingConsentStr) {
            try {
              pendingConsent = JSON.parse(pendingConsentStr);
              // Only use if less than 5 minutes old
              if (Date.now() - pendingConsent.timestamp < 5 * 60 * 1000) {
                // Clear it immediately to prevent re-use
                sessionStorage.removeItem('pendingConsent');
              } else {
                pendingConsent = null;
              }
            } catch (e) {
              pendingConsent = null;
            }
          }
          
          try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
            
            // First, ensure user exists in database (for social provider users)
            try {
              await fetch(`${API_URL}/auth/register-firebase-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: firebaseUser.uid,
                  email: firebaseUser.email
                })
              });
            } catch (dbErr) {
              // User might already exist, continue
            }
            
            // If we have pending consent, save it now
            if (pendingConsent && pendingConsent.termsAccepted && pendingConsent.privacyAccepted) {
              try {
                await fetch(`${API_URL}/auth/record-consent/${firebaseUser.uid}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    terms_accepted: pendingConsent.termsAccepted,
                    privacy_accepted: pendingConsent.privacyAccepted
                  })
                });
              } catch (consentSaveErr) {
                logClientError('AUTH-SAVE-CONSENT', consentSaveErr);
              }
            }
            
            // Check consent status
            const consentUrl = `${API_URL}/auth/check-consent/${firebaseUser.uid}`;
            
            const consentResponse = await fetch(consentUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            
            if (consentResponse.ok) {
              consentStatus = await consentResponse.json();
            }
          } catch (consentErr) {
            logClientError('AUTH-CONSENT', consentErr);
          }
          
          // Don't fetch /auth/user - we already have Firebase user info
          // Firebase provides: uid, email, emailVerified, displayName, etc.
          
          const newUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName,
            token,
            firebaseUser, // Store firebase user object for token refresh
            consentStatus,
            needsConsent: !consentStatus.hasConsent
          };
          
          setUser(newUser);

          // Save timezone to user_preferences
          await saveUserTimezone(firebaseUser.uid, token);
          
          // Set up token refresh interval (refresh every 45 minutes = 2700000ms)
          // Firebase tokens expire after 1 hour, so refreshing at 45 min is safe
          if (tokenRefreshIntervalRef.current) {
            clearInterval(tokenRefreshIntervalRef.current);
          }
          tokenRefreshIntervalRef.current = setInterval(() => {
            refreshToken(firebaseUser);
          }, 45 * 60 * 1000); // 45 minutes

        } else {
          setUser(null);
          // Clear token refresh interval
          if (tokenRefreshIntervalRef.current) {
            clearInterval(tokenRefreshIntervalRef.current);
            tokenRefreshIntervalRef.current = null;
          }
        }
      } catch (err) {
        logClientError('AUTH', err);
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      // Clean up interval on unmount
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
