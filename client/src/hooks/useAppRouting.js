import { useMemo } from 'react';
import { useDeviceTracking } from './useDeviceTracking';

/**
 * Determines which screen/route to display based on auth state
 * Email verification only for real email/password users (NOT temp accounts)
 */
export function useAppRouting(auth, appExited, showRegisterMode = false) {
    const { hasExitedBefore } = useDeviceTracking();

    const currentScreen = useMemo(() => {
        // Loading state
        if (auth.loading) return 'loading';

        // Exit screen
        if (appExited) return 'thankYou';

        // Register mode - CHECK THIS FIRST (before authenticated check)
        // This allows temp users to go to Firebase login to create real account
        if (showRegisterMode) return 'register';

        // Email verification for REAL email users only (NOT temp accounts)
        // Temp accounts skip this entirely
        if (auth.isAuthenticated && 
            auth.isEmailUser && 
            !auth.isTemporaryAccount && 
            !auth.emailVerified) {
            return 'verification';
        }

        // First time user or not authenticated
        if (auth.isFirstTime && !auth.isAuthenticated) {
            // If they've exited before, force Firebase login
            if (hasExitedBefore()) {
                return 'login';
            }
            return 'landing';
        }

        // Not authenticated
        if (!auth.isAuthenticated) {
            return 'login';
        }

        // Authenticated and verified - show chat
        return 'chat';
    }, [auth.loading, auth.isAuthenticated, auth.isFirstTime, auth.isTemporaryAccount, auth.isEmailUser, auth.emailVerified, appExited, showRegisterMode, hasExitedBefore]);

    return {
        currentScreen,
        isLoading: currentScreen === 'loading',
        isThankyou: currentScreen === 'thankYou',
        isRegister: currentScreen === 'register',
        isVerification: currentScreen === 'verification',
        isLanding: currentScreen === 'landing',
        isLogin: currentScreen === 'login',
        isChat: currentScreen === 'chat',
    };
}
