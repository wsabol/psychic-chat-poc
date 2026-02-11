/**
 * Price Migration Service
 * Orchestrates bulk subscription price migrations
 */
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';
import { updateSubscriptionPrice } from './stripePrice.js';
import { 
  getSubscribersByInterval,
  updateSubscriberPriceAmount,
  markMigrationCompleted 
} from './priceRepository.js';

/**
 * Migrate a single subscriber to a new price
 * @param {Object} subscriber - Subscriber record from database
 * @param {string} newPriceId - New Stripe price ID
 * @param {number} newAmount - New price amount in cents
 * @param {string} interval - Billing interval
 * @returns {Promise<Object>} Result object with success status
 */
async function migrateSingleSubscriber(subscriber, newPriceId, newAmount, interval) {
  try {
    // Update subscription in Stripe
    await updateSubscriptionPrice(subscriber.stripe_subscription_id, newPriceId);
    
    // Update database record
    await updateSubscriberPriceAmount(subscriber.id, newAmount);

    // Record successful migration in price_change_notifications using hashed user_id
    await markMigrationCompleted(subscriber.user_id, interval);

    return {
      success: true,
      userId: subscriber.user_id,
    };
  } catch (error) {
    logErrorFromCatch(error, 'price-migration', 'migrate-single-subscriber', subscriber.user_id);
    return {
      success: false,
      userId: subscriber.user_id,
      email: subscriber.email,
      error: error.message,
    };
  }
}

/**
 * Migrate multiple subscriptions to a new price
 * @param {string} oldPriceId - Old Stripe price ID (for reference/logging)
 * @param {string} newPriceId - New Stripe price ID
 * @param {string} interval - 'month' or 'year'
 * @param {number} newAmount - New price in cents
 * @returns {Promise<Object>} Migration results with success/failure counts
 */
export async function bulkMigrateSubscriptions(oldPriceId, newPriceId, interval, newAmount) {
  try {
    const subscribers = await getSubscribersByInterval(interval);
    
    const results = {
      total: subscribers.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each subscriber
    for (const subscriber of subscribers) {
      const migrationResult = await migrateSingleSubscriber(
        subscriber, 
        newPriceId, 
        newAmount, 
        interval
      );

      if (migrationResult.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({
          userId: migrationResult.userId,
          email: migrationResult.email,
          error: migrationResult.error,
        });
      }
    }

    return results;
  } catch (error) {
    logErrorFromCatch(error, 'price-migration', 'bulk-migrate-subscriptions');
    throw error;
  }
}

/**
 * Validate migration parameters before starting
 * @param {string} oldPriceId - Old Stripe price ID
 * @param {string} newPriceId - New Stripe price ID
 * @param {string} interval - Billing interval
 * @param {number} newAmount - New price amount
 * @returns {Object} Validation result
 */
export function validateMigrationParams(oldPriceId, newPriceId, interval, newAmount) {
  const errors = [];

  if (!oldPriceId || typeof oldPriceId !== 'string') {
    errors.push('Valid oldPriceId is required');
  }

  if (!newPriceId || typeof newPriceId !== 'string') {
    errors.push('Valid newPriceId is required');
  }

  if (!['month', 'year'].includes(interval)) {
    errors.push('Interval must be "month" or "year"');
  }

  if (!newAmount || typeof newAmount !== 'number' || newAmount <= 0) {
    errors.push('Valid newAmount (positive number) is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
