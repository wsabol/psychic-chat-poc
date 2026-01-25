/**
 * Price Management Facade
 * Simplified orchestration layer for price management operations
 * 
 * This module acts as the main entry point, coordinating between:
 * - stripePrice: Pure Stripe API operations
 * - priceRepository: Database queries
 * - priceMigrationService: Migration orchestration
 * - priceFormatter: Data formatting
 */
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { 
  createNewPrice, 
  updateSubscriptionPrice, 
  getAllActivePrices 
} from './stripePrice.js';
import { 
  getSubscribersByInterval, 
  getActiveSubscriberCount, 
  getMigrationStatus 
} from './priceRepository.js';
import { 
  bulkMigrateSubscriptions as migrateBulk,
  validateMigrationParams 
} from './priceMigrationService.js';
import { 
  enhancePriceObject, 
  formatMigrationResults,
  formatMigrationStatus 
} from './priceFormatter.js';

/**
 * Create a new price in Stripe
 * @param {number} amount - Price in cents
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Object>} Created Stripe price object with productId
 */
export async function createPrice(amount, interval) {
  return await createNewPrice(amount, interval);
}

/**
 * Update a subscription to use a new price
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} newPriceId - New Stripe price ID
 * @returns {Promise<Object>} Updated Stripe subscription object
 */
export async function updatePrice(subscriptionId, newPriceId) {
  return await updateSubscriptionPrice(subscriptionId, newPriceId);
}

/**
 * Get all subscribers for a given interval
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Array>} Array of subscriber records
 */
export async function getSubscribers(interval) {
  return await getSubscribersByInterval(interval);
}

/**
 * Get list of all active Stripe prices with subscriber counts
 * @returns {Promise<Array>} Array of enhanced price objects
 */
export async function getAllPricesWithSubscriberCounts() {
  try {
    // Get all active prices from Stripe
    const prices = await getAllActivePrices();

    // Enhance each price with subscriber count
    const pricesWithCounts = await Promise.all(
      prices.map(async (price) => {
        try {
          const interval = price.recurring?.interval || 'month';
          const subscriberCount = await getActiveSubscriberCount(interval);
          return enhancePriceObject(price, subscriberCount);
        } catch (err) {
          logErrorFromCatch(err, 'price-management', 'get-price-subscriber-count');
          return enhancePriceObject(price, 0);
        }
      })
    );

    return pricesWithCounts;
  } catch (error) {
    logErrorFromCatch(error, 'price-management', 'get-all-prices-with-counts');
    throw error;
  }
}

/**
 * Migrate multiple subscriptions to a new price with validation
 * @param {string} oldPriceId - Old Stripe price ID
 * @param {string} newPriceId - New Stripe price ID
 * @param {string} interval - 'month' or 'year'
 * @param {number} newAmount - New price in cents
 * @returns {Promise<Object>} Formatted migration results
 */
export async function bulkMigrateSubscriptions(oldPriceId, newPriceId, interval, newAmount) {
  try {
    // Validate parameters first
    const validation = validateMigrationParams(oldPriceId, newPriceId, interval, newAmount);
    if (!validation.isValid) {
      throw new Error(`Invalid migration parameters: ${validation.errors.join(', ')}`);
    }

    // Perform migration
    const results = await migrateBulk(oldPriceId, newPriceId, interval, newAmount);
    
    // Return formatted results
    return formatMigrationResults(results);
  } catch (error) {
    logErrorFromCatch(error, 'price-management', 'bulk-migrate-subscriptions');
    throw error;
  }
}

/**
 * Get migration status for a price change campaign
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Object>} Formatted migration statistics
 */
export async function getFormattedMigrationStatus(interval) {
  try {
    const status = await getMigrationStatus(interval);
    return formatMigrationStatus(status);
  } catch (error) {
    logErrorFromCatch(error, 'price-management', 'get-formatted-migration-status');
    throw error;
  }
}

/**
 * Get active subscriber count for an interval
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<number>} Count of active subscribers
 */
export async function getSubscriberCount(interval) {
  return await getActiveSubscriberCount(interval);
}

// Re-export commonly used functions for backward compatibility
export { 
  createNewPrice,
  updateSubscriptionPrice,
  getAllActivePrices
} from './stripePrice.js';

export { 
  getSubscribersByInterval,
  getMigrationStatus,
  getActiveSubscriberCount
} from './priceRepository.js';
