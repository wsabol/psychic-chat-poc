/**
 * Stripe Price Management Service
 * Handles subscription price changes and migrations
 */
import { stripe } from './stripeClient.js';
import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Create a new price in Stripe
 * @param {string} productId - Stripe product ID
 * @param {number} amount - Price in cents
 * @param {string} interval - 'month' or 'year'
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created Stripe price object
 */
export async function createNewPrice(productId, amount, interval, metadata = {}) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency: 'usd',
      recurring: {
        interval: interval,
        interval_count: 1,
      },
      metadata: {
        ...metadata,
        created_by: 'admin_price_management',
        created_at: new Date().toISOString(),
      },
    });

    return price;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe-price-management');
    throw error;
  }
}

/**
 * Update a subscription to use a new price
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} newPriceId - New Stripe price ID
 * @returns {Promise<Object>} Updated Stripe subscription object
 */
export async function updateSubscriptionPrice(subscriptionId, newPriceId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update subscription with new price
    // proration_behavior: 'none' means no immediate charge, change takes effect at next billing cycle
    // billing_cycle_anchor: 'unchanged' keeps the current billing date
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'none',
      billing_cycle_anchor: 'unchanged',
    });

    return updatedSubscription;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe-subscription-update');
    throw error;
  }
}

/**
 * Get all active subscribers with a specific price interval
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Array>} Array of user records with subscription info
 */
export async function getSubscribersByInterval(interval) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    const query = `
      SELECT 
        id,
        user_id,
        pgp_sym_decrypt(email_encrypted, $1) as email,
        subscription_status,
        price_interval,
        price_amount,
        current_period_end,
        pgp_sym_decrypt(stripe_subscription_id_encrypted, $1) as stripe_subscription_id
      FROM user_personal_info
      WHERE price_interval = $2
        AND subscription_status = 'active'
        AND stripe_subscription_id_encrypted IS NOT NULL
      ORDER BY id
    `;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY, interval]);
    return result.rows;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'get-subscribers');
    throw error;
  }
}

/**
 * Migrate multiple subscriptions to a new price
 * @param {string} oldPriceId - Old Stripe price ID
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

    for (const subscriber of subscribers) {
      try {
        // Update subscription in Stripe
        await updateSubscriptionPrice(subscriber.stripe_subscription_id, newPriceId);
        
        // Update database record
        await db.query(
          `UPDATE user_personal_info SET price_amount = $1 WHERE id = $2`,
          [newAmount, subscriber.id]
        );

        // Record successful migration in price_change_notifications
        await db.query(
          `UPDATE price_change_notifications 
           SET migration_completed = true, migration_completed_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND price_interval = $2 AND migration_completed = false`,
          [subscriber.id, interval]
        );

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: subscriber.user_id,
          email: subscriber.email,
          error: error.message,
        });
        logErrorFromCatch(error, 'app', 'bulk-migrate-subscription', subscriber.user_id);
      }
    }

    return results;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'bulk-migrate-subscriptions');
    throw error;
  }
}

/**
 * Get list of all active Stripe prices with product details
 * @returns {Promise<Array>} Array of Stripe price objects with product info
 */
export async function getAllActivePrices() {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    });

    return prices.data;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'get-active-prices');
    throw error;
  }
}

/**
 * Get migration status for a price change campaign
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Object>} Migration statistics
 */
export async function getMigrationStatus(interval) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_notified,
        COUNT(*) FILTER (WHERE migration_completed = true) as completed,
        COUNT(*) FILTER (WHERE migration_completed = false) as pending
      FROM price_change_notifications
      WHERE price_interval = $1
        AND notified_at > NOW() - INTERVAL '60 days'
    `;

    const result = await db.query(query, [interval]);
    return result.rows[0];
  } catch (error) {
    logErrorFromCatch(error, 'app', 'get-migration-status');
    throw error;
  }
}

/**
 * Get count of active subscribers by interval
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<number>} Count of active subscribers
 */
export async function getActiveSubscriberCount(interval) {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM user_personal_info
      WHERE price_interval = $1
        AND subscription_status = 'active'
        AND stripe_subscription_id_encrypted IS NOT NULL
    `;

    const result = await db.query(query, [interval]);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logErrorFromCatch(error, 'app', 'get-subscriber-count');
    throw error;
  }
}
