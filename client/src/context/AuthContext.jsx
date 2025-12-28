import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
          // Get ID token
          const token = await firebaseUser.getIdToken();
          
          // Don't fetch /auth/user - we already have Firebase user info
          // Firebase provides: uid, email, emailVerified, displayName, etc.
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName,
            token,
            firebaseUser // Store firebase user object for token refresh
          });

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
