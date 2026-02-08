/**
 * @deprecated This hook is deprecated as of 2026-02-08
 * 
 * Device tracking for free trial limits has been migrated to database-driven session management.
 * 
 * REPLACEMENT: Use useSessionCheck() hook instead, which checks:
 * - free_trial_sessions table by IP address hash
 * - security_sessions table for authenticated users
 * 
 * This hook now returns no-op functions for backward compatibility.
 * It will be removed in a future version.
 * 
 * See: client/src/hooks/useSessionCheck.js
 * See: api/routes/auth-endpoints/session-check.js
 */
export function useDeviceTracking() {
    // DEPRECATED: These functions no longer use localStorage
    // Session management is now handled via database checks
    const hasExitedBefore = () => {
        console.warn('[DEPRECATED] useDeviceTracking.hasExitedBefore() - Use useSessionCheck() instead');
        return false; // Default to false for backward compatibility
    };

    const markAsExited = () => {
        console.warn('[DEPRECATED] useDeviceTracking.markAsExited() - No longer needed with database session management');
        // No-op: Free trial completion is now tracked in database
    };

    const canTryFree = () => {
        console.warn('[DEPRECATED] useDeviceTracking.canTryFree() - Use useSessionCheck() instead');
        return true; // Default to true for backward compatibility
    };

    const resetTrialFlag = () => {
        console.warn('[DEPRECATED] useDeviceTracking.resetTrialFlag() - No longer needed with database session management');
        // No-op: Trial flags are now in database
    };

    return {
        hasExitedBefore,
        markAsExited,
        canTryFree,
        resetTrialFlag,
    };
}
