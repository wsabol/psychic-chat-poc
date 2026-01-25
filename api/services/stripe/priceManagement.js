/**
 * Stripe Price Management Service (Facade)
 * Simplified orchestration layer - delegates to modular services
 * 
 * This refactored version uses a modular architecture:
 * - price/stripePrice.js: Pure Stripe API operations
 * - price/priceRepository.js: Database queries
 * - price/priceMigrationService.js: Migration orchestration
 * - price/priceFormatter.js: Data formatting
 * - price/priceConfig.js: Configuration constants
 */

// Re-export all functions from the modular price management system
// This maintains backward compatibility with existing code
export {
  createNewPrice,
  updateSubscriptionPrice,
  getAllActivePrices,
} from './price/stripePrice.js';

export {
  getSubscribersByInterval,
  getActiveSubscriberCount,
  getMigrationStatus,
} from './price/priceRepository.js';

export {
  bulkMigrateSubscriptions,
} from './price/priceMigrationService.js';

// Also export the enhanced facade functions for new code
export {
  createPrice,
  updatePrice,
  getSubscribers,
  getAllPricesWithSubscriberCounts,
  getFormattedMigrationStatus,
  getSubscriberCount,
} from './price/priceManagement.js';
