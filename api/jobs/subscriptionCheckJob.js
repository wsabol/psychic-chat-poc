/**
 * Subscription Check Job
 * 
 * Runs every 4 hours to verify active subscriptions
 * - Fetches current subscription status from Stripe
 * - Updates database if status changed
 * - Notifies users of issues
 * - Logs errors to database
 * 
 * Usage:
 *   import { runSubscriptionCheckJob } from './subscriptionCheckJob.js';
 *   await runSubscriptionCheckJob();
 */

import { db } from '../shared/db.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { validateSubscriptionStatus, updateLastStatusCheck } from '../services/stripe/subscriptionValidator.js';
import { notifyBillingEvent, notifySubscriptionCheckFailed } from '../services/stripe/billingNotifications.js';
import { stripe } from '../services/stripe/stripeClient.js';

let jobRunning = false;
let lastRunTime = null;
let lastRunStats = {
  totalUsersChecked: 0,
  statusChanged: 0,
  notificationsSent: 0,
  errors: 0
};

/**
 * Main job function - runs every 4 hours
 */
export async function runSubscriptionCheckJob() {
  // Prevent concurrent execution
  if (jobRunning) {
    return { status: 'already_running' };
  }

  jobRunning = true;
  const startTime = Date.now();
  const stats = {
    totalUsersChecked: 0,
    statusChanged: 0,
    notificationsSent: 0,
    errors: 0,
    skipped: 0
  };

  try {
    // Get all users with subscriptions
    const users = await getAllUsersWithSubscriptions();
    stats.totalUsersChecked = users.length;

    if (users.length === 0) {
      jobRunning = false;
      return {
        status: 'completed',
        stats,
        duration: Date.now() - startTime
      };
    }

    // Check each user's subscription
    for (const user of users) {
      try {
        await checkUserSubscription(user, stats);
      } catch (error) {
        logErrorFromCatch(error, 'job', 'subscription-check-job', user.user_id);
        stats.errors++;
      }
    }

    // Update global stats
    lastRunTime = new Date();
    lastRunStats = { ...stats };

    // Only log if there were errors
    if (stats.errors > 0) {
      await logJobCompletion(stats, startTime);
    }

    return {
      status: 'completed',
      stats,
      duration: Date.now() - startTime
    };
  } catch (error) {
    logErrorFromCatch(error, 'job', 'subscription-check-job');
    stats.errors++;

    return {
      status: 'failed',
      error: error.message,
      stats,
      duration: Date.now() - startTime
    };
  } finally {
    jobRunning = false;
  }
}

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

    const result = await db.query(query, [process.env.ENCRYPTION_KEY]);
    return result.rows;
  } catch (error) {
    logErrorFromCatch(error, 'job', 'get-users-with-subscriptions');
    return [];
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
        // Send notification
        const issueType = mapSubscriptionStatusToIssueType(stripeSubscription.status);
        await notifyBillingEvent(user.user_id, issueType);
        stats.notificationsSent++;
      }
    } else {
      // Status unchanged, just update the last check timestamp
      await updateLastStatusCheck(user.user_id);
    }
  } catch (error) {
    // Check if Stripe is down
    if (error.message && error.message.includes('connect ENOTFOUND')) {
      // Stripe API is unreachable
      await notifySubscriptionCheckFailed(user.user_id, 'STRIPE_API_DOWN');
    } else {
      logErrorFromCatch(error, 'job', 'check-user-subscription', user.user_id);
    }
    throw error;
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
        current_period_start = $2,
        current_period_end = $3,
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
      const cancelQuery = `
        UPDATE user_personal_info
        SET subscription_cancelled_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `;
      await db.query(cancelQuery, [userId]);
    }
  } catch (error) {
    logErrorFromCatch(error, 'job', 'update-subscription-in-db', userId);
    throw error;
  }
}

/**
 * Map Stripe subscription status to notification issue type
 */
function mapSubscriptionStatusToIssueType(stripeStatus) {
  const mapping = {
    'past_due': 'SUBSCRIPTION_PAST_DUE',
    'canceled': 'SUBSCRIPTION_CANCELLED',
    'incomplete': 'SUBSCRIPTION_INCOMPLETE',
    'unpaid': 'SUBSCRIPTION_PAST_DUE',
    'paused': 'SUBSCRIPTION_INCOMPLETE'
  };

  return mapping[stripeStatus] || 'SUBSCRIPTION_INCOMPLETE';
}

/**
 * Log job completion to database for audit trail
 */
async function logJobCompletion(stats, startTime) {
  try {
    const duration = Date.now() - startTime;
    const message = `Subscription check job completed. Checked: ${stats.totalUsersChecked}, Changed: ${stats.statusChanged}, Notified: ${stats.notificationsSent}, Errors: ${stats.errors}, Duration: ${duration}ms`;

    await logErrorFromCatch(
      new Error(message),
      'job',
      'subscription-check-complete',
      null,
      null,
      'warning'
    );
  } catch (error) {
    // Silently fail - don't disrupt main job if logging fails
  }
}

/**
 * Get job status and last run info
 */
export function getSubscriptionCheckJobStatus() {
  return {
    running: jobRunning,
    lastRunTime,
    lastRunStats,
    schedule: 'Every 4 hours (0, 4, 8, 12, 16, 20 hours UTC)'
  };
}

export default {
  runSubscriptionCheckJob,
  getSubscriptionCheckJobStatus
};
