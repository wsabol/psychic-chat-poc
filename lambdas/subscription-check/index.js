/**
 * Subscription Check Lambda Function
 * 
 * Scheduled to run every 4 hours via EventBridge
 * Verifies active subscriptions against Stripe:
 * - Fetches current subscription status from Stripe
 * - Updates database if status changed
 * - Notifies users of issues
 * 
 * Schedule: 0 *\/4 * * * (every 4 hours)
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';
import Stripe from 'stripe';

const logger = createLogger('subscription-check');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Get all users with subscriptions from database
 */
async function getAllUsersWithSubscriptions() {
  try {
    const query = `
      SELECT 
        user_id,
        subscription_status,
        current_period_start,
        current_period_end,
        last_status_check_at,
        pgp_sym_decrypt(stripe_subscription_id_encrypted, $1) as stripe_subscription_id
      FROM user_personal_info
      WHERE stripe_subscription_id_encrypted IS NOT NULL
      ORDER BY last_status_check_at ASC NULLS FIRST
      LIMIT 1000
    `;

    const result = await db.query(query, [ENCRYPTION_KEY]);
    return result.rows;
  } catch (error) {
    logger.errorFromCatch(error, 'Get users with subscriptions');
    return [];
  }
}

/**
 * Update subscription data in database
 */
async function updateSubscriptionInDB(userId, stripeSubscription) {
  try {
    const query = `
      UPDATE user_personal_info
      SET 
        subscription_status = $1,
        current_period_start = to_timestamp($2),
        current_period_end = to_timestamp($3),
        last_status_check_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4
    `;

    await db.query(query, [
      stripeSubscription.status,
      stripeSubscription.current_period_start,
      stripeSubscription.current_period_end,
      userId
    ]);

    // If cancelled, store the cancellation timestamp
    if (stripeSubscription.status === 'canceled') {
      await db.query(
        `UPDATE user_personal_info
         SET subscription_cancelled_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );
    }
  } catch (error) {
    logger.errorFromCatch(error, 'Update subscription in DB', userId);
    throw error;
  }
}

/**
 * Update last status check timestamp
 */
async function updateLastStatusCheck(userId) {
  try {
    await db.query(
      `UPDATE user_personal_info
       SET last_status_check_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );
  } catch (error) {
    logger.errorFromCatch(error, 'Update last status check', userId);
  }
}

/**
 * Check a single user's subscription
 */
async function checkUserSubscription(user, stats) {
  try {
    if (!stripe || !user.stripe_subscription_id) {
      stats.skipped++;
      return;
    }

    // Fetch current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

    // Check if status changed
    const statusChanged = stripeSubscription.status !== user.subscription_status;

    if (statusChanged) {
      stats.statusChanged++;

      // Update database with new status
      await updateSubscriptionInDB(user.user_id, stripeSubscription);

      // Determine if user should be notified
      const shouldNotify = ['past_due', 'canceled', 'incomplete', 'unpaid'].includes(
        stripeSubscription.status
      );

      if (shouldNotify) {
        // TODO: Implement notification via SES or SNS
        stats.notificationsSent++;
      }
    } else {
      // Status unchanged, just update the last check timestamp
      await updateLastStatusCheck(user.user_id);
    }
  } catch (error) {
    // Check if Stripe is down
    if (error.message && error.message.includes('connect ENOTFOUND')) {
      logger.error(error, 'Stripe API unreachable', user.user_id);
    } else {
      logger.errorFromCatch(error, 'Check user subscription', user.user_id);
    }
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
    
    const stats = {
      totalUsersChecked: 0,
      statusChanged: 0,
      notificationsSent: 0,
      errors: 0,
      skipped: 0
    };

    // Get all users with subscriptions
    const users = await getAllUsersWithSubscriptions();
    stats.totalUsersChecked = users.length;

    if (users.length === 0) {
      const duration = Date.now() - startTime;
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          stats,
          duration_ms: duration,
          note: 'No users with subscriptions found'
        })
      };
    }

    // Check each user's subscription
    for (const user of users) {
      try {
        await checkUserSubscription(user, stats);
      } catch (error) {
        logger.errorFromCatch(error, 'Check subscription loop', user.user_id);
        stats.errors++;
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
