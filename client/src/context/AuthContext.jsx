import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { saveUserTimezone } from '../utils/timezoneUtils';

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
        console.log('[AUTH] Token refreshed successfully');
      }
    } catch (err) {
      console.error('[AUTH] Error refreshing token:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('[AUTH] User logged in:', firebaseUser.uid);
          
          // Get ID token
          const token = await firebaseUser.getIdToken();
          
          // Check if user has accepted consent
          let consentStatus = {
            hasConsent: false,
            terms_accepted: false,
            privacy_accepted: false
          };
          
          try {
            const consentUrl = `http://localhost:3000/auth/check-consent/${firebaseUser.uid}`;
            console.log('[AUTH] Checking consent at:', consentUrl);
            
            const consentResponse = await fetch(consentUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            console.log('[AUTH] Consent check response status:', consentResponse.status);
            
            if (consentResponse.ok) {
              consentStatus = await consentResponse.json();
              console.log('[AUTH] Consent status returned:', consentStatus);
              console.log('[AUTH] hasConsent =', consentStatus.hasConsent, '| terms =', consentStatus.terms_accepted, '| privacy =', consentStatus.privacy_accepted);
            } else {
              console.warn('[AUTH] Consent check returned non-200:', consentResponse.status);
              const errorText = await consentResponse.text();
              console.warn('[AUTH] Error response:', errorText);
            }
          } catch (consentErr) {
            console.warn('[AUTH] Could not check consent:', consentErr.message);
            console.error('[AUTH] Consent error details:', consentErr);
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
          
          console.log('[AUTH] Setting user with needsConsent =', newUser.needsConsent);
          setUser(newUser);

          // Save timezone to user_preferences
          await saveUserTimezone(firebaseUser.uid, token);
          
          // Set up token refresh interval (refresh every 45 minutes = 2700000ms)
          // Firebase tokens expire after 1 hour, so refreshing at 45 min is safe
          if (tokenRefreshIntervalRef.current) {
            clearInterval(tokenRefreshIntervalRef.current);
          }
          tokenRefreshIntervalRef.current = setInterval(() => {
            console.log('[AUTH] Auto-refreshing token');
            refreshToken(firebaseUser);
          }, 45 * 60 * 1000); // 45 minutes

        } else {
          console.log('[AUTH] User logged out');
          setUser(null);
          // Clear token refresh interval
          if (tokenRefreshIntervalRef.current) {
            clearInterval(tokenRefreshIntervalRef.current);
            tokenRefreshIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('[AUTH] Error in onAuthStateChanged:', err);
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
