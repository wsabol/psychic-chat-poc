import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { saveUserTimezone } from '../utils/timezoneUtils';

// Client-side error logging helper (non-critical, for debugging)
function logClientError(context, error) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
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
      try {
        if (firebaseUser) {
          
          // Get ID token
          const token = await firebaseUser.getIdToken();
          
          // Check if user has accepted consent
          let consentStatus = {
            hasConsent: false,
            terms_accepted: false,
            privacy_accepted: false
          };
          
                    try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
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
            } else {
              const errorText = await consentResponse.text();
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

