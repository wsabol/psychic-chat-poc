/**
 * @deprecated
 * This file is a backward-compatibility shim.
 * All free trial logic now lives in api/services/freeTrialService.js.
 * Import directly from there instead of this file.
 */
export {
  createFreeTrialSession,
  updateFreeTrialStep,
  completeFreeTrialSession,
  getFreeTrialSession,
} from '../services/freeTrialService.js';
