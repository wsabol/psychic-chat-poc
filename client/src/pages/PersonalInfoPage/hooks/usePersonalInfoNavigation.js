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
      return;
    }

    // Temp/guest users cannot poll astrology (auth-protected endpoint, no token).
    // Navigate directly to the horoscope page — FreeTrialHoroscopePage will load
    // its own data via the /free-trial/horoscope endpoint (no auth required).
    if (isTemporaryAccount) {
      onNavigateToPage(targetPage);
      return;
    }

    // Poll for astrology data before navigating if needed (regular users only)
    if (shouldPoll) {
      await pollForAstrology(userId, token, API_URL, {
        maxAttempts: TIMING.ASTROLOGY_POLL_MAX_ATTEMPTS,
        intervalMs: TIMING.ASTROLOGY_POLL_INTERVAL_MS,
        onReady: () => {
          onNavigateToPage(targetPage);
        },
        onTimeout: () => {
          onNavigateToPage(targetPage);
        }
      });
    }

  };

  return {
    getNavigationTarget,
    shouldNavigateAfterSave,
    navigateToTarget
  };
}
