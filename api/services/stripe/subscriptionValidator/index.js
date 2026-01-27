/**
 * Subscription Validator - Public API
 * 
 * Refactored subscription validation service with improved:
 * - Code organization (separation of concerns)
 * - Error handling (explicit error types)
 * - Maintainability (DRY principle, constants)
 * - Testability (dependency injection ready)
 * - Type safety (JSDoc types)
 */

import {
  validateSubscriptionStatus,
  validatePaymentMethod,
  validateSubscriptionHealth
} from './validators.js';
import {
  getCachedSubscriptionStatusFromDB,
  updateLastStatusCheckInDB
} from './repository.js';

// Re-export validation functions
export { validateSubscriptionStatus, validatePaymentMethod, validateSubscriptionHealth };

/**
 * Get subscription status from database cache
 * This is a lightweight operation that doesn't hit Stripe API
 * @param {string} userId - User ID
 * @returns {Promise<CachedSubscriptionStatus|null>}
 */
export async function getCachedSubscriptionStatus(userId) {
  const result = await getCachedSubscriptionStatusFromDB(userId);
  return result.success ? result.data : null;
}

/**
 * Update last status check timestamp
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function updateLastStatusCheck(userId) {
  await updateLastStatusCheckInDB(userId);
}

// Default export for backwards compatibility
export default {
  validateSubscriptionStatus,
  validatePaymentMethod,
  validateSubscriptionHealth,
  getCachedSubscriptionStatus,
  updateLastStatusCheck
};
