import { useMemo } from 'react';

/**
 * Determines which screen/route to display based on auth state, payment method, and subscription
 * 
 * Flow for permanent users:
 * 1. Auth check
 * 2. 2FA check
 * 3. Email verification (if email user)
 * 4. Payment method check → if missing, show payment setup screen
 * 5. Subscription check → if expired, show subscription required screen
 * 6. Chat
 * 
 * Flow for temp accounts:
 * - Skip all checks, go directly to chat
 * 
 * Special flags:
 * - skipPaymentCheck: User clicked "Add Payment Method", bypass check and go to chat/billing
 * - skipSubscriptionCheck: User clicked "Subscribe", bypass check and go to chat/subscriptions
 * 
 * @param {Object} sessionCheckData - Database session check data (replaces localStorage)
 */
export function useAppRouting(auth, appExited, showRegisterMode = false, skipPaymentCheck = false, skipSubscriptionCheck = false, isAdmin = false, isOnboarding = false, sessionCheckData = null) {

    const currentScreen = useMemo(() => {
        // Loading state
        if (auth.loading) return 'loading';

        // Exit screen
        if (appExited) return 'thankYou';

        // 2FA verification - CHECK THIS EARLY (before payment/subscription check)
        // 2FA can apply to both temp accounts (during registration) and established accounts (after login)
        // For established accounts: auth.authUserId is set, not auth.tempUserId
        // For temp accounts: auth.tempUserId is set
        if (auth.showTwoFactor && (auth.tempUserId || auth.authUserId) && auth.tempToken) {
            return 'twoFactor';
        }

        // Register mode - CHECK THIS FIRST (before authenticated check)
        if (showRegisterMode) return 'register';

        // Email verification for REAL email users only (NOT temp accounts)
        if (auth.isAuthenticated && 
            auth.isEmailUser && 
            !auth.isTemporaryAccount && 
            !auth.emailVerified) {
            return 'verification';
        }

        // User explicitly logged out
        // ✅ Dev users see landing page for testing, others see login page
        if (!auth.isAuthenticated && auth.hasLoggedOut) {
            return auth.isDevUserLogout ? 'landing' : 'login';
        }

        // First time user or not authenticated - Use database session check instead of localStorage
        if (auth.isFirstTime && !auth.isAuthenticated) {
            // If session check data is available, use it to determine routing
            if (sessionCheckData) {
                // If user has completed free trial from this IP, must login
                if (sessionCheckData.hasCompletedTrial || sessionCheckData.userType === 'free_trial_completed') {
                    return 'login';
                }
                // If new user (no database record), show landing page
                if (sessionCheckData.userType === 'new') {
                    return 'landing';
                }
            }
            // Fallback to landing if no session data yet
            return 'landing';
        }

        // ✅ ORPHANED FIREBASE USER CHECK - DISABLED
        // This check was causing login loops because sessionCheckData might return 'new'
        // before security_sessions table is updated after login
        // The API session-check endpoint now properly handles users mid-onboarding
        // if (auth.isAuthenticated && !auth.isTemporaryAccount && sessionCheckData && sessionCheckData.userType === 'new') {
        //     // Firebase user exists but no database record - treat as first time user
        //     return 'landing';
        // }

        // Not authenticated
        if (!auth.isAuthenticated) {
            return 'login';
        }

                // ✅ PAYMENT METHOD CHECK - User must have valid payment method FIRST
        // Exception: Temp accounts don't need payment method (trial only)
        // Exception: Admins don't need payment method
        // Exception: If skipPaymentCheck flag set, bypass this check
        if (!skipPaymentCheck && !auth.isTemporaryAccount && !isAdmin && !auth.paymentMethodChecking) {
            // Payment method check is complete (not checking)
            if (!auth.hasValidPaymentMethod) {
                // No valid payment method - show payment method required screen
                return 'paymentMethodRequired';
            }
        }
        
                // ✅ SUBSCRIPTION CHECK - User must have active subscription (AFTER payment method)
        // Exception: Temp accounts don't need subscriptions (trial only)
        // Exception: Admins don't need subscriptions
        // Exception: If skipSubscriptionCheck flag set, bypass this check
        if (!skipSubscriptionCheck && !auth.isTemporaryAccount && !isAdmin && !auth.subscriptionChecking) {
            // Subscription check is complete (not checking)
            if (!auth.hasActiveSubscription) {
                // No active subscription - show subscription required screen
                return 'subscriptionRequired';
            }
        }
        
        // If still checking payment or subscription and not skipping, show loading

        // Authenticated, verified, has payment method (or skipping check), and has active subscription (or skipping check) - show chat
        return 'chat';
    }, [auth.loading, auth.isAuthenticated, auth.isFirstTime, auth.isTemporaryAccount, auth.isEmailUser, auth.emailVerified, auth.hasLoggedOut, auth.isDevUserLogout, auth.hasValidPaymentMethod, auth.paymentMethodChecking, auth.hasActiveSubscription, auth.subscriptionChecking, auth.showTwoFactor, auth.tempUserId, auth.authUserId, auth.tempToken, appExited, showRegisterMode, skipPaymentCheck, skipSubscriptionCheck, isAdmin, sessionCheckData]);

    return {
        currentScreen,
        isLoading: currentScreen === 'loading',
        isThankyou: currentScreen === 'thankYou',
        isRegister: currentScreen === 'register',
        isVerification: currentScreen === 'verification',
        isLanding: currentScreen === 'landing',
        isLogin: currentScreen === 'login',
        isTwoFactor: currentScreen === 'twoFactor',
        isPaymentMethodRequired: currentScreen === 'paymentMethodRequired',
        isSubscriptionRequired: currentScreen === 'subscriptionRequired',
        isChat: currentScreen === 'chat',
    };
}
