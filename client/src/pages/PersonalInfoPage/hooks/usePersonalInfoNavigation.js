import { TIMING } from '../../../utils/personalInfoUtils';

/**
 * Custom hook for managing post-save navigation logic
 * Handles navigation decisions and astrology polling
 * @param {Object} params - Configuration parameters
 * @returns {Object} Navigation handlers
 */
export function usePersonalInfoNavigation({
  isTemporaryAccount,
  userId,
  token,
  API_URL,
  onNavigateToPage,
  pollForAstrology
}) {
  /**
   * Determine target page based on account type and context
   * @returns {number} Page index to navigate to
   */
  const getNavigationTarget = () => {
    // Onboarding users (regular accounts) always go to Chat (0) for welcome modal
    if (!isTemporaryAccount) {
      return 0; // Chat page
    }
    // Temp users go to horoscope page
    return 5; // Horoscope page
  };

  /**
   * Check if we should navigate after save
   * @returns {boolean} Whether to navigate
   */
  const shouldNavigateAfterSave = () => {
    // Only navigate if we have the navigation callback
    if (!onNavigateToPage) {
      return false;
    }
    // Always navigate for onboarding users (regular accounts)
    // Always navigate for temp users
    return true;
  };

  /**
   * Navigate to target page with optional astrology polling
   * @param {boolean} shouldPoll - Whether to poll for astrology data
   */
  const navigateToTarget = async (shouldPoll = true) => {
    const targetPage = getNavigationTarget();

    if (!onNavigateToPage) {
      console.error('[PERSONAL-INFO-NAV] ERROR: No navigation callback provided');
      return;
    }

    // Poll for astrology data before navigating if needed
    if (shouldPoll) {
      const pollAttempts = isTemporaryAccount ? 60 : TIMING.ASTROLOGY_POLL_MAX_ATTEMPTS;
      const pollInterval = isTemporaryAccount ? 200 : TIMING.ASTROLOGY_POLL_INTERVAL_MS;

      try {
        await pollForAstrology(userId, token, API_URL, {
          maxAttempts: pollAttempts,
          intervalMs: pollInterval,
          onReady: () => {
            onNavigateToPage(targetPage);
          },
          onTimeout: () => {
            onNavigateToPage(targetPage);
          }
        });
      } catch (error) {
        console.error('[PERSONAL-INFO-NAV] ERROR during polling:', error);
        // Try to navigate anyway
        console.log('[PERSONAL-INFO-NAV] Attempting navigation despite error...');
        onNavigateToPage(targetPage);
      }
    }

  };

  return {
    getNavigationTarget,
    shouldNavigateAfterSave,
    navigateToTarget
  };
}
