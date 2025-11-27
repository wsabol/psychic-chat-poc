import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState(null);
    const [authUserId, setAuthUserId] = useState(null);
    const [authEmail, setAuthEmail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    const idToken = await firebaseUser.getIdToken();
                    setAuthUserId(firebaseUser.uid);
                    setAuthEmail(firebaseUser.email);
                    setToken(idToken);
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                    setAuthUserId(null);
                    setAuthEmail(null);
                    setToken(null);
                }
            } catch (err) {
                console.error('Auth error:', err);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsAuthenticated(false);
            setAuthUserId(null);
            setAuthEmail(null);
            setToken(null);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    return {
        isAuthenticated,
        token,
        authUserId,
        authEmail,
        loading,
        handleLogout,
        // Add dummy properties for backward compatibility
        showLoginRegister: false,
        setShowLoginRegister: () => {},
        showTwoFactor: false,
        setShowTwoFactor: () => {},
        showForgotPassword: false,
        setShowForgotPassword: () => {},
        showEmailVerification: false,
        setShowEmailVerification: () => {},
        tempToken: null,
        tempUserId: null,
        twoFactorMethod: 'sms',
        error: null,
        setError: () => {},
    };
}
