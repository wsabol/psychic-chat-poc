import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get ID token
          const token = await firebaseUser.getIdToken();
          
          // Get user profile from backend
          const response = await fetch(`http://localhost:3000/auth/user`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const profile = await response.json();
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            token,
            profile
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
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