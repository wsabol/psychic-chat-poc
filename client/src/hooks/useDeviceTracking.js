/**
 * Device tracking for free trial limits
 * Prevents users from using multiple free trials on same device
 */
export function useDeviceTracking() {
    const hasExitedBefore = () => {
        return localStorage.getItem('user_exited_app') === 'true';
    };

    const markAsExited = () => {
        localStorage.setItem('user_exited_app', 'true');
    };

    const canTryFree = () => {
        return !hasExitedBefore();
    };

    const resetTrialFlag = () => {
        localStorage.removeItem('user_exited_app');
    };

    return {
        hasExitedBefore,
        markAsExited,
        canTryFree,
        resetTrialFlag,
    };
}
