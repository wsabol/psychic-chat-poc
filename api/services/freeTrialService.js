/**
 * Free Trial Service — Barrel Re-export
 *
 * Re-exports every public symbol from the focused sub-services under
 * api/services/freeTrial/ so that existing callers require no import changes.
 *
 * Sub-services:
 *   freeTrial/sessionService.js      — Session lifecycle (create / resume / update / complete / get)
 *   freeTrial/personalInfoService.js — Input sanitization, personal info DB, orchestration
 *   freeTrial/astrologyService.js    — Astrology DB ops, birth chart Lambda, zodiac resolution
 *   freeTrial/preferenceService.js   — Language and timezone preference updates
 */

// ── Session Management ────────────────────────────────────────────────────────
export {
  createFreeTrialSession,
  updateFreeTrialStep,
  completeFreeTrialSession,
  getFreeTrialSession,
} from './freeTrial/sessionService.js';

// ── Personal Info ─────────────────────────────────────────────────────────────
export {
  sanitizePersonalInfo,
  savePersonalInfo,
  verifyPersonalInfoSaved,
  updateTrialSessionEmail,
  processPersonalInfoSave,
} from './freeTrial/personalInfoService.js';

// ── Astrology ─────────────────────────────────────────────────────────────────
export {
  saveMinimalAstrology,
  saveFullAstrologyData,
  clearAstrologyMessages,
  calculateAndSaveFullBirthChart,
  SIGN_MIDPOINT_DATES,
  persistPickedZodiacSign,
  resolveZodiacSignForTrial,
} from './freeTrial/astrologyService.js';

// ── Preferences ───────────────────────────────────────────────────────────────
export {
  refreshLanguagePreference,
  updateTimezonePreference,
} from './freeTrial/preferenceService.js';
