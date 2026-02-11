/**
 * Violation detection and enforcement service - Barrel export
 * 
 * SIMPLIFIED VERSION - Database only, no Firebase
 * 
 * ENFORCED VIOLATIONS (trigger warnings/suspensions):
 * - Sexual content
 * - Self-harm/suicide intent
 * - Harm to others
 * - Abusive/profane language
 * 
 * NOT ENFORCED (handled by oracle in guardrails):
 * - Financial advice requests (oracle just won't provide it)
 * - Medical advice requests (oracle just won't provide it)
 */

// Detection
export { detectViolation, VIOLATION_TYPES } from './violation/violationDetector.js';

// Responses
export {
  getViolationResponse,
  getSelfHarmHotlineResponse,
  getTempAccountViolationResponse,
  getWarningResponse,
  getSuspensionResponse,
  getPermanentBanResponse
} from './violation/violationResponses.js';

// Status checks
export { isAccountSuspended, isAccountDisabled } from './violation/violationStatus.js';

// Enforcement
export { recordViolationAndGetAction } from './violation/violationEnforcementCore.js';

// Redemption
export {
  checkViolationRedemption,
  resetViolationCount,
  getRedemptionMessage,
  getRedemptionConfig,
  applyPendingRedemptions
} from './violation/violationRedemption.js';
