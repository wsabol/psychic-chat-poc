/**
 * FreeTrial Mode Component
 * Handles UI/logic specific to free trial (temporary account) mode
 * 
 * Features:
 * - User gets full app access after saving personal info
 * - 90-second timer on chat page (triggers astrology prompt)
 * - Back button exits the app
 * - Can navigate anywhere via swipes and nav
 */
export function FreeTrialMode({ children }) {
  // Currently a pass-through wrapper
  // In the future, this can handle:
  // - Trial-specific UI overlays
  // - Trial remaining time indicators
  // - Trial expiration warnings
  // - Special trial-only features
  
  return <>{children}</>;
}
