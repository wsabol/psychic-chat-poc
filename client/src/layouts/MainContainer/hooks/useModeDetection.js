import { useMemo } from 'react';
import { MODE_TYPES } from '../modeConfig';

/**
 * useModeDetection - Detects current application mode
 * 
 * Returns the current mode based on auth state and onboarding status:
 * - FREE_TRIAL: User is on temporary account (isTemporaryAccount = true)
 * - ONBOARDING: User is going through onboarding (isOnboarding = true)
 * - NORMAL: Regular user with full app access
 * 
 * @param {Object} auth - Auth state object
 * @param {Object} onboarding - Onboarding state object
 * @returns {string} Current mode (FREE_TRIAL | ONBOARDING | NORMAL)
 */
export function useModeDetection(auth, onboarding) {
  return useMemo(() => {
    // Free trial mode: temporary accounts (take precedence)
    if (auth?.isTemporaryAccount) {
      return MODE_TYPES.FREE_TRIAL;
    }

    // Onboarding mode: user is actively onboarding
    if (onboarding?.onboardingStatus?.isOnboarding === true) {
      return MODE_TYPES.ONBOARDING;
    }

    // Normal mode: established user with full access
    return MODE_TYPES.NORMAL;
  }, [auth?.isTemporaryAccount, onboarding?.onboardingStatus?.isOnboarding]);
}
