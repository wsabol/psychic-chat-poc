/**
 * Mode Configuration
 * Defines rules, allowed pages, and behavior for each application mode
 */

export const MODE_TYPES = {
  FREE_TRIAL: 'free_trial',
  ONBOARDING: 'onboarding',
  NORMAL: 'normal',
};

/**
 * Rules for each mode
 * - allowedPages: null = all pages allowed, array = only these page indices allowed
 * - swipeEnabled: whether swipe gestures navigate between pages
 * - backButtonExits: whether back button exits app (true) or navigates (false)
 * - navDisabled: whether navigation UI is disabled
 * - canNavigateViaNav: whether user can click nav to go to restricted pages
 */
export const MODE_RULES = {
  [MODE_TYPES.FREE_TRIAL]: {
    allowedPages: null, // Can go anywhere after personal info
    swipeEnabled: true,
    backButtonExits: true,
    navDisabled: false,
    canNavigateViaNav: true,
  },
  [MODE_TYPES.ONBOARDING]: {
    allowedPages: [0, 1, 9], // Chat, Personal Info, Billing
    swipeEnabled: false,
    backButtonExits: false,
    navDisabled: true,
    canNavigateViaNav: false,
  },
  [MODE_TYPES.NORMAL]: {
    allowedPages: null, // All pages
    swipeEnabled: true,
    backButtonExits: false,
    navDisabled: false,
    canNavigateViaNav: true,
  },
};

/**
 * Determine if a page transition is allowed in current mode
 * @param {number} pageIndex - The page index to navigate to
 * @param {string} mode - Current mode (from MODE_TYPES)
 * @returns {boolean} Whether navigation is allowed
 */
export function isPageAllowedInMode(pageIndex, mode) {
  const rules = MODE_RULES[mode];
  if (!rules) return false;
  
  // null = all pages allowed
  if (rules.allowedPages === null) {
    return true;
  }
  
  // Array = only specific pages allowed
  return rules.allowedPages.includes(pageIndex);
}

/**
 * Determine if swipe navigation is enabled in current mode
 * @param {string} mode - Current mode (from MODE_TYPES)
 * @returns {boolean} Whether swipe is enabled
 */
export function isSwipeEnabledInMode(mode) {
  const rules = MODE_RULES[mode];
  return rules?.swipeEnabled ?? false;
}

/**
 * Determine if back button should exit app or navigate
 * @param {string} mode - Current mode (from MODE_TYPES)
 * @returns {boolean} Whether back button exits
 */
export function shouldBackButtonExit(mode) {
  const rules = MODE_RULES[mode];
  return rules?.backButtonExits ?? false;
}

/**
 * Determine if navigation UI should be disabled
 * @param {string} mode - Current mode (from MODE_TYPES)
 * @returns {boolean} Whether nav is disabled
 */
export function isNavDisabledInMode(mode) {
  const rules = MODE_RULES[mode];
  return rules?.navDisabled ?? false;
}

/**
 * Determine if user can navigate via nav clicks
 * @param {string} mode - Current mode (from MODE_TYPES)
 * @returns {boolean} Whether nav clicks are allowed
 */
export function canNavigateViaNav(mode) {
  const rules = MODE_RULES[mode];
  return rules?.canNavigateViaNav ?? false;
}
