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
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const [subscriptionChecking, setSubscriptionChecking] = useState(false);
    const [hasValidPaymentMethod, setHasValidPaymentMethod] = useState(false);
    const [paymentMethodChecking, setPaymentMethodChecking] = useState(false);
    
    const { trackDevice } = useDeviceSecurityTracking();

    // Check if user has valid payment method (card or verified bank account)
    const checkPaymentMethod = useCallback(async (idToken, userId) => {
        try {
            setPaymentMethodChecking(true);
            const response = await fetch('http://localhost:3000/billing/payment-methods', {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                // User has valid payment method if:
                // - Has at least one card, OR
                // - Has at least one VERIFIED bank account
                const hasCard = data.cards && data.cards.length > 0;
                const hasVerifiedBank = data.bankAccounts && data.bankAccounts.some(
                    bank => bank.us_bank_account?.verification_status === 'verified'
                );
                const hasValid = hasCard || hasVerifiedBank;
                
                console.log('[AUTH] Payment method check - Has valid:', hasValid, 'Cards:', data.cards?.length || 0, 'Verified banks:', data.bankAccounts?.filter(b => b.us_bank_account?.verification_status === 'verified').length || 0);
                setHasValidPaymentMethod(hasValid);
                return hasValid;
            } else {
                console.warn('[AUTH] Could not fetch payment methods:', response.status);
                setHasValidPaymentMethod(false);
                return false;
            }
        } catch (err) {
            console.error('[AUTH] Error checking payment method:', err);
            setHasValidPaymentMethod(false);
            return false;
        } finally {
            setPaymentMethodChecking(false);
        }
    }, []);

    // Fetch subscription status when user authenticates
    const checkSubscriptionStatus = useCallback(async (idToken, userId) => {
        try {
            setSubscriptionChecking(true);
            const response = await fetch('http://localhost:3000/billing/subscriptions', {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                const subscriptions = await response.json();
                // Check if user has any active subscriptions (not cancelled, not cancelled at period end)
                const hasActive = subscriptions.some(sub => sub.status === 'active' && !sub.cancel_at_period_end);
                console.log('[AUTH] Subscription check - Has active:', hasActive, 'Subscriptions:', subscriptions.length);
                setHasActiveSubscription(hasActive);
                return hasActive;
            } else {
                console.warn('[AUTH] Could not fetch subscriptions:', response.status);
                setHasActiveSubscription(false);
                return false;
            }
        } catch (err) {
            console.error('[AUTH] Error checking subscription status:', err);
            setHasActiveSubscription(false);
            return false;
        } finally {
            setSubscriptionChecking(false);
        }
    }, []);

    // Check both payment method and subscription SEQUENTIALLY (not concurrently)
    // This prevents duplicate Stripe customer creation from concurrent calls
    const checkBillingStatus = useCallback(async (idToken, userId) => {
        try {
            console.log('[AUTH] Starting billing status checks (payment method first, then subscription)');
            // Check payment method FIRST
            const hasPayment = await checkPaymentMethod(idToken, userId);
            // Then check subscription AFTER payment check completes
            await checkSubscriptionStatus(idToken, userId);
        } catch (err) {
            console.error('[AUTH] Error checking billing status:', err);
        }
    }, [checkPaymentMethod, checkSubscriptionStatus]);

    // Re-check only subscription (not payment method)
    // Called when user returns from billing page after adding payment method
    const recheckSubscriptionOnly = useCallback(async (idToken, userId) => {
        try {
            console.log('[AUTH] Re-checking subscription status only');
            await checkSubscriptionStatus(idToken, userId);
        } catch (err) {
            console.error('[AUTH] Error re-checking subscription:', err);
        }
    }, [checkSubscriptionStatus]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
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
                        // Temporary accounts - authenticate immediately (no 2FA, no subscription/payment checks)
                        setIsFirstTime(true);
                        setIsAuthenticated(true);
                        setHasActiveSubscription(false);
                        setHasValidPaymentMethod(false);
                        setLoading(false);
                    } else {
                        // Permanent accounts
                        setIsFirstTime(false);
                        localStorage.setItem('psychic_app_registered', 'true');
                        
                        // ✅ OPTION B: Skip 2FA if email NOT verified (brand new account)
                        if (!firebaseUser.emailVerified) {
                          setShowTwoFactor(false);
                          setIsAuthenticated(true);
                          // Check billing status (payment method then subscription) - SEQUENTIAL
                          checkBillingStatus(idToken, firebaseUser.uid);
                          setLoading(false);
                          return;
                        }
                        
                        // Email IS verified - existing user logging in
                        
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
                          setShowTwoFactor(false);
                          setIsAuthenticated(true);
                          // Check billing status sequentially
                          checkBillingStatus(idToken, firebaseUser.uid);
                          setLoading(false);
                        } else {
                          try {
                            const twoFAResponse = await fetch(`http://localhost:3000/auth/check-2fa/${firebaseUser.uid}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            const twoFAData = await twoFAResponse.json();
                            
                            if (twoFAData.requires2FA) {
                              // 2FA required - show 2FA screen, DON'T authenticate
                              setTempToken(twoFAData.tempToken);
                              setTempUserId(firebaseUser.uid);
                              setShowTwoFactor(true);
                              setTwoFactorMethod(twoFAData.method || 'email');
                              setIsAuthenticated(false);
                            } else {
                              // No 2FA required - authenticate now
                              setShowTwoFactor(false);
                              setIsAuthenticated(true);
                              // Check billing status sequentially
                              checkBillingStatus(idToken, firebaseUser.uid);
                            }
                          } catch (err) {
                              console.warn('[2FA-CHECK] Failed to check 2FA:', err);
                              setIsAuthenticated(true);
                              // Still check billing status even if 2FA check fails
                              checkBillingStatus(idToken, firebaseUser.uid);
                          } finally {
                              setLoading(false);
                          }
                        }
                    }
                } else {
                    setIsAuthenticated(false);
                    setAuthUserId(null);
                    setAuthEmail(null);
                    setToken(null);
                    setIsTemporaryAccount(false);
                    setShowTwoFactor(false);
                    setTempToken(null);
                    setTempUserId(null);
                    setHasActiveSubscription(false);
                    setHasValidPaymentMethod(false);
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
    }, [checkBillingStatus]);

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
            setHasActiveSubscription(false);
            setHasValidPaymentMethod(false);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const refreshEmailVerificationStatus = async () => {
        try {
            if (auth.currentUser) {
                await auth.currentUser.reload();
                setEmailVerified(auth.currentUser.emailVerified);
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
            
            // Mark 2FA as verified in this session so page refreshes don't require it again
            sessionStorage.setItem(`2fa_verified_${tempUserId}`, 'true');
            
            setTempToken(null);
            setTempUserId(null);
            setShowTwoFactor(false);
            setIsAuthenticated(true);
            
            // After 2FA, check billing status (payment method then subscription) - SEQUENTIAL
            if (token) {
                checkBillingStatus(token, tempUserId);
            }
            
            setError(null);
            return true;
        } catch (err) {
            console.error('[2FA] Verification error:', err);
            setError('Failed to verify 2FA code');
            return false;
        }
    }, [tempUserId, tempToken, token, checkBillingStatus]);

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
        hasActiveSubscription,
        subscriptionChecking,
        hasValidPaymentMethod,
        paymentMethodChecking,
        recheckSubscriptionOnly,
    };
}
