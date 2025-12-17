import { useMemo } from 'react';
import { useDeviceTracking } from './useDeviceTracking';

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
 */
export function useAppRouting(auth, appExited, showRegisterMode = false, skipPaymentCheck = false, skipSubscriptionCheck = false) {
    const { hasExitedBefore } = useDeviceTracking();

    const currentScreen = useMemo(() => {
        // Loading state
        if (auth.loading) return 'loading';

        // Exit screen
        if (appExited) return 'thankYou';

        // 2FA verification - CHECK THIS EARLY (before payment/subscription check)
        if (auth.showTwoFactor && auth.tempUserId && auth.tempToken) {
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

        // User explicitly logged out - show landing page
        if (!auth.isAuthenticated && auth.hasLoggedOut) {
            return 'landing';
        }

        // First time user or not authenticated
        if (auth.isFirstTime && !auth.isAuthenticated) {
            if (hasExitedBefore()) {
                return 'login';
            }
            return 'landing';
        }

        // Not authenticated
        if (!auth.isAuthenticated) {
            return 'login';
        }

        // ✅ PAYMENT METHOD CHECK - User must have valid payment method BEFORE subscribing
        // Exception: Temp accounts skip this (trial only)
        // Exception: If skipPaymentCheck flag set, bypass this check
        if (!skipPaymentCheck && !auth.isTemporaryAccount && !auth.paymentMethodChecking) {
            // Payment method check is complete
            if (!auth.hasValidPaymentMethod) {
                // No valid payment method - show payment setup screen
                console.log('[ROUTING] Blocking - No valid payment method');
                return 'paymentMethodRequired';
            }
        }
        
        // If still checking payment method and not skipping, show loading
        if (!skipPaymentCheck && !auth.isTemporaryAccount && auth.paymentMethodChecking) {
            console.log('[ROUTING] Loading - Checking payment method');
            return 'loading';
        }

        // ✅ SUBSCRIPTION CHECK - User must have active subscription
        // Exception: Temp accounts don't need subscriptions (trial only)
        // Exception: If skipSubscriptionCheck flag set, bypass this check
        if (!skipSubscriptionCheck && !auth.isTemporaryAccount && !auth.subscriptionChecking) {
            // Subscription check is complete (not checking)
            console.log('[ROUTING] Subscription check complete:', {
                skipSubscriptionCheck,
                isTemporaryAccount: auth.isTemporaryAccount,
                hasActiveSubscription: auth.hasActiveSubscription,
                subscriptionChecking: auth.subscriptionChecking
            });
            if (!auth.hasActiveSubscription) {
                // No active subscription - show subscription required screen
                console.log('[ROUTING] Blocking - No active subscription');
                return 'subscriptionRequired';
            }
        }
        
        // If still checking subscription and not skipping, show loading
        if (!skipSubscriptionCheck && !auth.isTemporaryAccount && auth.subscriptionChecking) {
            console.log('[ROUTING] Loading - Checking subscription');
            return 'loading';
        }

        console.log('[ROUTING] Allowing chat access');
        // Authenticated, verified, has payment method (or skipping check), and has active subscription (or skipping check) - show chat
        return 'chat';
    }, [auth.loading, auth.isAuthenticated, auth.isFirstTime, auth.isTemporaryAccount, auth.isEmailUser, auth.emailVerified, auth.hasLoggedOut, auth.hasValidPaymentMethod, auth.paymentMethodChecking, auth.hasActiveSubscription, auth.subscriptionChecking, appExited, showRegisterMode, skipPaymentCheck, skipSubscriptionCheck, hasExitedBefore]);

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
