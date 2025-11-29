import { useMemo } from 'react';
import { useDeviceTracking } from './useDeviceTracking';

/**
 * Determines which screen/route to display based on auth state
 * Returns current screen name and route logic
 */
export function useAppRouting(auth, appExited) {
    const { hasExitedBefore } = useDeviceTracking();

    const currentScreen = useMemo(() => {
        // Loading state
        if (auth.loading) return 'loading';

        // Exit screen
        if (appExited) return 'thankYou';

        // Register mode
        if (auth.isAuthenticated === false && auth.showRegisterMode === true) return 'register';

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

        // Authenticated - show chat
        return 'chat';
    }, [auth.loading, auth.isAuthenticated, auth.isFirstTime, appExited, hasExitedBefore]);

    return {
        currentScreen,
        isLoading: currentScreen === 'loading',
        isThankyou: currentScreen === 'thankYou',
        isRegister: currentScreen === 'register',
        isLanding: currentScreen === 'landing',
        isLogin: currentScreen === 'login',
        isChat: currentScreen === 'chat',
    };
}
