import { useMemo } from 'react';
import {
  isPageAllowedInMode,
  isSwipeEnabledInMode,
  shouldBackButtonExit,
  isNavDisabledInMode,
  canNavigateViaNav,
} from '../modeConfig';

/**
 * useModeRules - Provides rule checking functions for current mode
 * Memoizes all rule functions so they're stable across renders
 * 
 * @param {string} mode - Current mode from useModeDetection
 * @returns {Object} Object with rule checking methods
 */
export function useModeRules(mode) {
  return useMemo(() => ({
    /**
     * Check if navigation to a specific page is allowed
     * @param {number} pageIndex - Page index to check
     * @returns {boolean}
     */
    isPageAllowed: (pageIndex) => isPageAllowedInMode(pageIndex, mode),

    /**
     * Check if swipe gestures should work
     * @returns {boolean}
     */
    isSwipeEnabled: () => isSwipeEnabledInMode(mode),

    /**
     * Check if back button should exit the app
     * @returns {boolean}
     */
    backButtonShouldExit: () => shouldBackButtonExit(mode),

    /**
     * Check if navigation UI should be disabled
     * @returns {boolean}
     */
    isNavDisabled: () => isNavDisabledInMode(mode),

    /**
     * Check if user can navigate via nav component clicks
     * @returns {boolean}
     */
    canClickNav: () => canNavigateViaNav(mode),
  }), [mode]);
}
