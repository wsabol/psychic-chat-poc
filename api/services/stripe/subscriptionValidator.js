/**
 * Subscription Validator Service
 * 
 * REFACTORED: This file now serves as a compatibility layer
 * The actual implementation has been modularized into:
 * - subscriptionValidator/constants.js - All constants and enums
 * - subscriptionValidator/types.js - JSDoc type definitions
 * - subscriptionValidator/repository.js - Database operations
 * - subscriptionValidator/validators.js - Business logic
 * - subscriptionValidator/index.js - Public API
 * 
 * This maintains backward compatibility for existing imports.
 */

export {
  validateSubscriptionStatus,
  validatePaymentMethod,
  validateSubscriptionHealth,
  getCachedSubscriptionStatus,
  updateLastStatusCheck
} from './subscriptionValidator/index.js';

// Default export for backward compatibility
export { default } from './subscriptionValidator/index.js';
