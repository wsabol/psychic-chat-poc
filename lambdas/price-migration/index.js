/**
 * Price Migration Lambda Function
 * 
 * Scheduled to run daily via EventBridge
 * Automatically migrates subscriptions after 30-day notice period:
 * - Checks for price change notifications with effective_date <= NOW()
 * - Updates subscriptions in Stripe to use new prices
 * - Archives old prices that are fully migrated
 * 
 * Schedule: 0 4 * * * (daily at 4:00 AM UTC)
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';
import Stripe from 'stripe';

const logger = createLogger('price-migration');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Migrate a single subscription to new price
 */
async function migrateSubscription(subscriptionId, newPriceId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update the subscription to use the new price
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'none', // No proration - changes take effect at next billing
    });

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Archive an old price in Stripe
 */
async function archiveOldPrice(priceId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    await stripe.prices.update(priceId, {
      active: false
    });
    return true;
  } catch (error) {
    logger.errorFromCatch(error, `Archive price ${priceId}`);
    throw error;
  }
}

/**
 * Lambda handler function
 * @param {Object} event - EventBridge scheduled event
 * @returns {Object} Execution result
 */
export const handler = async (event) => {
  const startTime = Date.now();
  
  try {
    // Validate environment
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }
    
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    // Find all notifications ready for migration
    const query = `
      SELECT 
        pcn.id,
        pcn.user_id_hash,
        upi.user_id,
        pcn.old_price_id,
        pcn.new_price_id,
        pcn.price_interval,
        pcn.old_price_amount,
        pcn.new_price_amount,
        pcn.effective_date,
        pgp_sym_decrypt(upi.stripe_subscription_id_encrypted, $1) as subscription_id
      FROM price_change_notifications pcn
      JOIN user_personal_info upi ON pcn.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
      WHERE pcn.effective_date <= NOW()
        AND pcn.migration_completed = false
        AND upi.subscription_status = 'active'
        AND upi.stripe_subscription_id_encrypted IS NOT NULL
      ORDER BY pcn.effective_date ASC
    `;

    const result = await db.query(query, [ENCRYPTION_KEY]);
    const pendingMigrations = result.rows;

    const stats = {
      total: pendingMigrations.length,
      successful: 0,
      failed: 0,
      pricesArchived: 0
    };
    
    // Track which old prices have been fully migrated
    const oldPricesMigrated = new Map();

    for (const migration of pendingMigrations) {
      try {
        // Migrate the subscription
        await migrateSubscription(migration.subscription_id, migration.new_price_id);

        // Mark as completed
        await db.query(
          `UPDATE price_change_notifications 
           SET migration_completed = true,
               migration_completed_at = NOW()
           WHERE id = $1`,
          [migration.id]
        );

        // Update user's price info in database
        await db.query(
          `UPDATE user_personal_info
           SET current_price = $1,
               price_interval = $2
           WHERE user_id = $3`,
          [migration.new_price_amount, migration.price_interval, migration.user_id]
        );

        stats.successful++;
        
        // Track successful migrations by old price ID
        if (migration.old_price_id) {
          if (!oldPricesMigrated.has(migration.old_price_id)) {
            oldPricesMigrated.set(migration.old_price_id, 0);
          }
          oldPricesMigrated.set(migration.old_price_id, oldPricesMigrated.get(migration.old_price_id) + 1);
        }
      } catch (error) {
        stats.failed++;
        logger.errorFromCatch(error, `Migrate notification ${migration.id}`, migration.user_id);
      }
    }

    // Auto-archive old prices that have been fully migrated
    if (oldPricesMigrated.size > 0) {
      for (const [oldPriceId, migratedCount] of oldPricesMigrated) {
        try {
          // Check if there are any remaining active subscribers on this old price
          const remainingQuery = `
            SELECT COUNT(*) as count
            FROM price_change_notifications
            WHERE old_price_id = $1
              AND migration_completed = false
          `;
          
          const remainingResult = await db.query(remainingQuery, [oldPriceId]);
          const remainingCount = parseInt(remainingResult.rows[0].count, 10);
          
          if (remainingCount === 0) {
            await archiveOldPrice(oldPriceId);
            stats.pricesArchived++;
          }
        } catch (error) {
          logger.errorFromCatch(error, `Archive check for ${oldPriceId}`);
        }
      }
    }

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stats,
        duration_ms: duration
      })
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.errorFromCatch(error, 'Lambda execution failed');
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: duration
      })
    };
  }
};

export default { handler };
