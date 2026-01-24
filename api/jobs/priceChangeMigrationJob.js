/**
 * Price Change Migration Job
 * 
 * Runs daily to automatically migrate subscriptions after 30-day notice period
 * Checks for price_change_notifications where:
 * - effective_date <= NOW()
 * - migration_completed = false
 * 
 * Automatically migrates those subscriptions to new prices
 */

import { db } from '../shared/db.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Migrate a single subscription to new price
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} newPriceId - New Stripe price ID
 * @returns {Promise<boolean>} Success status
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
 * @param {string} priceId - Stripe price ID to archive
 * @returns {Promise<boolean>} Success status
 */
async function archiveOldPrice(priceId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    await stripe.prices.update(priceId, {
      active: false
    });
    console.log(`[Price Migration Job] ✓ Archived old price: ${priceId}`);
    return true;
  } catch (error) {
    console.error(`[Price Migration Job] ✗ Failed to archive price ${priceId}:`, error.message);
    throw error;
  }
}

/**
 * Process pending migrations
 * Called by scheduler daily
 */
export async function processPendingMigrations() {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    console.log('[Price Migration Job] Starting migration check...');

    // Find all notifications ready for migration
    const query = `
      SELECT 
        pcn.id,
        pcn.user_id,
        pcn.old_price_id,
        pcn.new_price_id,
        pcn.price_interval,
        pcn.old_price_amount,
        pcn.new_price_amount,
        pcn.effective_date,
        pgp_sym_decrypt(upi.stripe_subscription_id_encrypted, $1) as subscription_id
      FROM price_change_notifications pcn
      JOIN user_personal_info upi ON pcn.user_id = upi.user_id
      WHERE pcn.effective_date <= NOW()
        AND pcn.migration_completed = false
        AND upi.subscription_status = 'active'
        AND upi.stripe_subscription_id_encrypted IS NOT NULL
      ORDER BY pcn.effective_date ASC
    `;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY]);
    const pendingMigrations = result.rows;

    console.log(`[Price Migration Job] Found ${pendingMigrations.length} subscriptions to migrate`);

    let successCount = 0;
    let failureCount = 0;
    
    // Track which old prices have been fully migrated
    const oldPricesMigrated = new Map();

    for (const migration of pendingMigrations) {
      try {
        console.log(`[Price Migration Job] Migrating subscription ${migration.subscription_id} to price ${migration.new_price_id}`);

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

        successCount++;
        
        // Track successful migrations by old price ID
        if (migration.old_price_id) {
          if (!oldPricesMigrated.has(migration.old_price_id)) {
            oldPricesMigrated.set(migration.old_price_id, 0);
          }
          oldPricesMigrated.set(migration.old_price_id, oldPricesMigrated.get(migration.old_price_id) + 1);
        }
        
        console.log(`[Price Migration Job] ✓ Successfully migrated notification ID ${migration.id}`);
      } catch (error) {
        failureCount++;
        console.error(`[Price Migration Job] ✗ Failed to migrate notification ID ${migration.id}:`, error.message);
        
        logErrorFromCatch(
          error,
          'app',
          'price-migration-job',
          migration.user_id
        );

        // Log the failure but don't stop the process
        // Mark with an error note in the database
        await db.query(
          `UPDATE price_change_notifications 
           SET migration_completed = false
           WHERE id = $1`,
          [migration.id]
        ).catch(err => console.error('Failed to update error status:', err));
      }
    }

    console.log(`[Price Migration Job] Complete: ${successCount} successful, ${failureCount} failed`);

    // Auto-archive old prices that have been fully migrated
    if (oldPricesMigrated.size > 0) {
      console.log(`[Price Migration Job] Checking ${oldPricesMigrated.size} old prices for archiving...`);
      
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
            console.log(`[Price Migration Job] All subscribers migrated from ${oldPriceId} (${migratedCount} total). Archiving...`);
            await archiveOldPrice(oldPriceId);
          } else {
            console.log(`[Price Migration Job] ${oldPriceId} still has ${remainingCount} pending migrations. Keeping active.`);
          }
        } catch (error) {
          console.error(`[Price Migration Job] Error archiving price ${oldPriceId}:`, error.message);
          // Don't fail the job if archiving fails - it's not critical
        }
      }
    }

    return {
      total: pendingMigrations.length,
      successful: successCount,
      failed: failureCount,
      pricesArchived: oldPricesMigrated.size
    };
  } catch (error) {
    console.error('[Price Migration Job] Job failed:', error);
    logErrorFromCatch(error, 'app', 'price-migration-job');
    throw error;
  }
}

export default {
  processPendingMigrations
};
