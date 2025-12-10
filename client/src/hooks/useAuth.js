import { useEffect, useState, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { useDeviceSecurityTracking } from './useDeviceSecurityTracking';

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
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [tempToken, setTempToken] = useState(null);
    const [tempUserId, setTempUserId] = useState(null);
    const [twoFactorMethod, setTwoFactorMethod] = useState('email');
    const [error, setError] = useState(null);
    
    const { trackDevice } = useDeviceSecurityTracking();

    useEffect(() => {
        console.log('[AUTH-LISTENER] Setting up auth state listener...');
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    console.log('[AUTH-LISTENER] User authenticated:', firebaseUser.uid, firebaseUser.email);
                    const isTemp = firebaseUser.email.startsWith('temp_');
                    const idToken = await firebaseUser.getIdToken();
                    
                    // Check session persistence preference and set Firebase persistence
                    if (!isTemp) {
                        try {
                            const persistenceResponse = await fetch(`http://localhost:3000/security/2fa-settings/${firebaseUser.uid}`, {
                                headers: { 'Authorization': `Bearer ${idToken}` }
                            });
                            
                            if (persistenceResponse.ok) {
                                const persistenceData = await persistenceResponse.json();
                                const persistentSession = persistenceData.settings?.persistent_session || false;
                                
                                // Set Firebase persistence based on user preference
                                const persistence = persistentSession ? browserLocalPersistence : browserSessionPersistence;
                                try {
                                    await setPersistence(auth, persistence);
                                    console.log('[AUTH-PERSISTENCE] Set to:', persistentSession ? 'LOCAL (30 days)' : 'SESSION (closes on browser exit)');
                                } catch (err) {
                                    console.warn('[AUTH-PERSISTENCE] Could not set persistence:', err.message);
                                }
                            }
                        } catch (err) {
                            console.warn('[AUTH-PERSISTENCE] Could not fetch settings:', err.message);
                        }
                    }
                    
                    // Set auth state
                    setAuthUserId(firebaseUser.uid);
                    setAuthEmail(firebaseUser.email);
                    setToken(idToken);
                    setIsTemporaryAccount(isTemp);
                    setEmailVerified(firebaseUser.emailVerified);
                    const isEmail = firebaseUser.providerData.some(p => p.providerId === 'password');
                    setIsEmailUser(isEmail);
                    
                    if (isTemp) {
                        // Temporary accounts - authenticate immediately (no 2FA)
                        console.log('[AUTH-LISTENER] Temp account detected - authenticating immediately');
                        setIsFirstTime(true);
                        setIsAuthenticated(true);
                        setLoading(false);
                    } else {
                        // Permanent accounts
                        console.log('[AUTH-LISTENER] Permanent account detected');
                        setIsFirstTime(false);
                        localStorage.setItem('psychic_app_registered', 'true');
                        
                        // ✅ OPTION B: Skip 2FA if email NOT verified (brand new account)
                        if (!firebaseUser.emailVerified) {
                          console.log('[AUTH-LISTENER] Email NOT verified (new account) - skipping 2FA, show email verification');
                          setShowTwoFactor(false);
                          setIsAuthenticated(true);
                          setLoading(false);
                          return;
                        }
                        
                        // Email IS verified - existing user logging in
                        console.log('[AUTH-LISTENER] Email verified - checking 2FA...');
                        
                        // Log login to audit
                        fetch('http://localhost:3000/auth/log-login-success', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ userId: firebaseUser.uid, email: firebaseUser.email }) 
                        }).catch(err => console.warn('[AUDIT] Login log skipped'));
                        
                        // Check if 2FA was already verified in THIS SESSION
                        const twoFAVerifiedKey = `2fa_verified_${firebaseUser.uid}`;
                        const alreadyVerified = sessionStorage.getItem(twoFAVerifiedKey);
                        
                        if (alreadyVerified) {
                          console.log('[2FA-CHECK] 2FA already verified in session, skipping check');
                          setShowTwoFactor(false);
                          setIsAuthenticated(true);
                          setLoading(false);
                        } else {
                          try {
                            console.log('[2FA-CHECK] Checking 2FA for user:', firebaseUser.uid);
                            const twoFAResponse = await fetch(`http://localhost:3000/auth/check-2fa/${firebaseUser.uid}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            const twoFAData = await twoFAResponse.json();
                            console.log('[2FA-CHECK] Response:', twoFAData);
                            
                            if (twoFAData.requires2FA) {
                              // 2FA required - show 2FA screen, DON'T authenticate
                              console.log('[2FA-CHECK] 2FA required, showing 2FA screen');
                              setTempToken(twoFAData.tempToken);
                              setTempUserId(firebaseUser.uid);
                              setShowTwoFactor(true);
                              setTwoFactorMethod(twoFAData.method || 'email');
                              setIsAuthenticated(false); // ← KEY: Don't authenticate until 2FA passes
                            } else {
                              // No 2FA required - authenticate now
                              console.log('[2FA-CHECK] No 2FA required, authenticating now');
                              setShowTwoFactor(false);
                              setIsAuthenticated(true);
                            }
                          } catch (err) {
                              console.warn('[2FA-CHECK] Failed to check 2FA:', err);
                              setIsAuthenticated(true);
                          } finally {
                              setLoading(false);
                          }
                        }
                    }
                } else {
                    console.log('[AUTH-LISTENER] User logged out');
                    setIsAuthenticated(false);
                    setAuthUserId(null);
                    setAuthEmail(null);
                    setToken(null);
                    setIsTemporaryAccount(false);
                    setShowTwoFactor(false);
                    setTempToken(null);
                    setTempUserId(null);
                    const hasRegistered = localStorage.getItem('psychic_app_registered');
                    if (hasRegistered) {
                        setIsFirstTime(false);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error('[AUTH-LISTENER] Error:', err);
                setIsAuthenticated(false);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, [trackDevice]);

    const createTemporaryAccount = async () => {
        try {
            setLoading(true);
            const uuid = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
            const tempEmail = `temp_${uuid}@psychic.local`;
            const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
            
            localStorage.setItem('temp_account_uid', userCredential.user.uid);
            localStorage.setItem('temp_account_email', tempEmail);
            sessionStorage.setItem('temp_user_id', userCredential.user.uid);
            console.log('[TEMP-ACCOUNT] Temp account created:', tempEmail);
            console.log('[TEMP-ACCOUNT] Temp user ID saved to sessionStorage:', userCredential.user.uid);
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
            setShowTwoFactor(false);
            setTempToken(null);
            setTempUserId(null);
            setHasLoggedOut(true);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const refreshEmailVerificationStatus = async () => {
        try {
            if (auth.currentUser) {
                await auth.currentUser.reload();
                setEmailVerified(auth.currentUser.emailVerified);
                console.log('[EMAIL-VERIFY-REFRESH] Updated emailVerified status:', auth.currentUser.emailVerified);
                return auth.currentUser.emailVerified;
            }
        } catch (err) {
            console.error('[EMAIL-VERIFY-REFRESH] Error refreshing email status:', err);
        }
        return false;
    };

    const exitApp = async () => {
        // For temp accounts, try to delete, but always log out regardless
        if (isTemporaryAccount) {
            try {
                await deleteTemporaryAccount();
            } catch (err) {
                console.warn('[EXIT-APP] Delete failed, signing out anyway:', err);
            }
        }
        // Always sign out at the end
        await handleLogout();
    };

    const verify2FA = useCallback(async (code) => {
        try {
            if (!tempUserId || !tempToken) {
                setError('2FA session expired. Please log in again.');
                return false;
            }
            
            const response = await fetch('http://localhost:3000/auth/verify-2fa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tempToken}`
                },
                body: JSON.stringify({
                    userId: tempUserId,
                    code: code
                })
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                setError(data.error || '2FA verification failed');
                return false;
            }
            
            // 2FA verified - NOW authenticate
            console.log('[2FA] Code verified, authenticating user');
            
            // Mark 2FA as verified in this session so page refreshes don't require it again
            sessionStorage.setItem(`2fa_verified_${tempUserId}`, 'true');
            
            setTempToken(null);
            setTempUserId(null);
            setShowTwoFactor(false);
            setIsAuthenticated(true); // ← KEY: Only authenticate after 2FA passes
            setError(null);
            
            console.log('[2FA] Verification successful, session marked');
            return true;
        } catch (err) {
            console.error('[2FA] Verification error:', err);
            setError('Failed to verify 2FA code');
            return false;
        }
    }, [tempUserId, tempToken]);

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
        refreshEmailVerificationStatus,
        createTemporaryAccount,
        deleteTemporaryAccount,
        exitApp,
        showLoginRegister: false,
        setShowLoginRegister: () => {},
        showTwoFactor,
        setShowTwoFactor,
        showForgotPassword: false,
        setShowForgotPassword: () => {},
        showEmailVerification: false,
        setShowEmailVerification: () => {},
        tempToken,
        tempUserId,
        twoFactorMethod,
        error,
        setError,
        verify2FA,
    };
}
