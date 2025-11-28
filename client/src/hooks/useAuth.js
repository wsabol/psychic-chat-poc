import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isTemporaryAccount, setIsTemporaryAccount] = useState(false);
    const [token, setToken] = useState(null);
    const [authUserId, setAuthUserId] = useState(null);
    const [authEmail, setAuthEmail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFirstTime, setIsFirstTime] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    // Check if this is a temporary account
                    const isTemp = firebaseUser.email.startsWith('temp_');
                    
                    const idToken = await firebaseUser.getIdToken();
                    setAuthUserId(firebaseUser.uid);
                    setAuthEmail(firebaseUser.email);
                    setToken(idToken);
                    setIsAuthenticated(true);
                    setIsTemporaryAccount(isTemp);
                    // Only mark as not first-time if they have a REAL account (not temp)
                    if (!isTemp) {
                        setIsFirstTime(false);
                        localStorage.setItem('psychic_app_registered', 'true');
                    }
                } else {
                    // Not authenticated
                    setIsAuthenticated(false);
                    setAuthUserId(null);
                    setAuthEmail(null);
                    setToken(null);
                    setIsTemporaryAccount(false);
                    
                    // Check if they've registered before
                    const hasRegistered = localStorage.getItem('psychic_app_registered');
                    if (hasRegistered) {
                        setIsFirstTime(false);
                    }
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

    const createTemporaryAccount = async () => {
        try {
            setLoading(true);
            // Generate unique temp email and password
            const uuid = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
            const tempEmail = `temp_${uuid}@psychic.local`;
            const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            // Create Firebase user
            const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
            
            // Store temp credentials in localStorage for later deletion
            localStorage.setItem('temp_account_uid', userCredential.user.uid);
            localStorage.setItem('temp_account_email', tempEmail);
            
            // Auth state listener will pick up the new temp user and handle isFirstTime
            // Don't set it here - let the auth listener handle it
        } catch (err) {
            console.error('Failed to create temporary account:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteTemporaryAccount = async () => {
        try {
            if (isTemporaryAccount && auth.currentUser) {
                // Delete Firebase user
                await auth.currentUser.delete();
                
                // Clean up localStorage
                localStorage.removeItem('temp_account_uid');
                localStorage.removeItem('temp_account_email');
                localStorage.removeItem('psychic_app_registered');
                
                setIsAuthenticated(false);
                setAuthUserId(null);
                setAuthEmail(null);
                setToken(null);
                setIsTemporaryAccount(false);
                setIsFirstTime(true);
            }
        } catch (err) {
            console.error('Failed to delete temporary account:', err);
            // If user deleted on Firebase console, just clear state
            setIsAuthenticated(false);
            setAuthUserId(null);
            setAuthEmail(null);
            setToken(null);
            setIsTemporaryAccount(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsAuthenticated(false);
            setAuthUserId(null);
            setAuthEmail(null);
            setToken(null);
            setIsTemporaryAccount(false);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const exitApp = async () => {
        // If temporary account, delete it
        if (isTemporaryAccount) {
            await deleteTemporaryAccount();
        } else {
            await handleLogout();
        }
    };

    return {
        isAuthenticated,
        isTemporaryAccount,
        token,
        authUserId,
        authEmail,
        loading,
        isFirstTime,
        handleLogout,
        createTemporaryAccount,
        deleteTemporaryAccount,
        exitApp,
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
