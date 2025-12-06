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
    const [emailVerified, setEmailVerified] = useState(false);
    const [isEmailUser, setIsEmailUser] = useState(false);
    const [hasLoggedOut, setHasLoggedOut] = useState(false);

    useEffect(() => {
        console.log('[AUTH-LISTENER] Setting up auth state listener...');
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    console.log('[AUTH-LISTENER] User authenticated:', firebaseUser.uid, firebaseUser.email);
                    const isTemp = firebaseUser.email.startsWith('temp_');
                    const idToken = await firebaseUser.getIdToken();
                    setAuthUserId(firebaseUser.uid);
                    setAuthEmail(firebaseUser.email);
                    setToken(idToken);
                    setIsAuthenticated(true);
                    setIsTemporaryAccount(isTemp);
                    setEmailVerified(firebaseUser.emailVerified);
                    const isEmail = firebaseUser.providerData.some(p => p.providerId === 'password');
                    setIsEmailUser(isEmail);
                    if (!isTemp) {
                        setIsFirstTime(false);
                        localStorage.setItem('psychic_app_registered', 'true');
                    }
                } else {
                    console.log('[AUTH-LISTENER] User logged out');
                    setIsAuthenticated(false);
                    setAuthUserId(null);
                    setAuthEmail(null);
                    setToken(null);
                    setIsTemporaryAccount(false);
                    const hasRegistered = localStorage.getItem('psychic_app_registered');
                    if (hasRegistered) {
                        setIsFirstTime(false);
                    }
                }
            } catch (err) {
                console.error('[AUTH-LISTENER] Error:', err);
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
            const uuid = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
            const tempEmail = `temp_${uuid}@psychic.local`;
            const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
            
            localStorage.setItem('temp_account_uid', userCredential.user.uid);
            localStorage.setItem('temp_account_email', tempEmail);
            console.log('[TEMP-ACCOUNT] Temp account created:', tempEmail);
        } catch (err) {
            console.error('[TEMP-ACCOUNT] Failed to create temporary account:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteTemporaryAccount = async () => {
        try {
            if (isTemporaryAccount && auth.currentUser) {
                const uid = auth.currentUser.uid;
                const email = auth.currentUser.email;
                
                console.log('[TEMP-ACCOUNT] Deleting temp account:', uid, email);
                
                let userToken = null;
                
                try {
                    userToken = await auth.currentUser.getIdToken();
                } catch (err) {
                    console.warn('[TEMP-ACCOUNT] Could not get ID token:', err.message);
                }
                
                // Call backend to delete from database and Firebase
                if (userToken) {
                    try {
                        const deleteUrl = 'http://localhost:3000/cleanup/delete-temp-account/' + uid;
                        const response = await fetch(deleteUrl, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${userToken}` }
                        });
                        
                        if (response.ok) {
                            console.log('[TEMP-ACCOUNT] Backend deletion successful');
                        } else {
                            console.error('[TEMP-ACCOUNT] Backend deletion failed:', response.status);
                        }
                    } catch (err) {
                        console.warn('[TEMP-ACCOUNT] Backend cleanup failed:', err.message);
                    }
                }
                
                // Also try to delete from Firebase client-side
                try {
                    const currentUser = auth.currentUser;
                    if (currentUser) {
                        await currentUser.delete();
                        console.log('[TEMP-ACCOUNT] Firebase user deleted from client');
                    }
                } catch (err) {
                    console.warn('[TEMP-ACCOUNT] Firebase client-side deletion note:', err.message);
                }
                
                // Clean up localStorage
                localStorage.removeItem('temp_account_uid');
                localStorage.removeItem('temp_account_email');
                
                // Clear state
                setIsAuthenticated(false);
                setAuthUserId(null);
                setAuthEmail(null);
                setToken(null);
                setIsTemporaryAccount(false);
            }
        } catch (err) {
            console.error('[TEMP-ACCOUNT] Failed to delete temporary account:', err);
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
            setHasLoggedOut(true);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const exitApp = async () => {
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
        emailVerified,
        isEmailUser,
        hasLoggedOut,
        setHasLoggedOut,
        handleLogout,
        createTemporaryAccount,
        deleteTemporaryAccount,
        exitApp,
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
