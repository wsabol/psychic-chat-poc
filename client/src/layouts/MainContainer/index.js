/**
 * MainContainer refactoring exports
 * Central hub for mode-based architecture
 */

// Mode configuration
export { MODE_TYPES, MODE_RULES, isPageAllowedInMode, isSwipeEnabledInMode, shouldBackButtonExit, isNavDisabledInMode, canNavigateViaNav } from './modeConfig';

// Mode detection hooks
export { useModeDetection } from './hooks/useModeDetection';
export { useModeRules } from './hooks/useModeRules';

// Mode components
export { FreeTrialMode } from './modes/FreeTrial/FreeTrialMode';
export { OnboardingMode } from './modes/Onboarding/OnboardingMode';
export { NormalMode } from './modes/Normal/NormalMode';
