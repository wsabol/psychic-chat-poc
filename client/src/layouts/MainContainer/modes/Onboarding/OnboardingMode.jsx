/**
 * Onboarding Mode Component
 * Handles UI/logic specific to onboarding mode
 * 
 * Features:
 * - Restricts navigation to only 3 pages: Chat (0), Personal Info (1), Billing (9)
 * - Disables swipe navigation
 * - Disables nav clicks to restricted pages
 * - Prevents back button navigation
 * - Shows onboarding modal overlay (handled by parent)
 */
export function OnboardingMode({ children }) {
  // Currently a pass-through wrapper
  // In the future, this can handle:
  // - Onboarding-specific styling
  // - Progress indicators
  // - Step-by-step UI guides
  // - Onboarding completion animations
  
  return <>{children}</>;
}
