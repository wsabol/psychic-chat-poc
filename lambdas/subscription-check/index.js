/**
 * Subscription Check Lambda Function
 *
 * Scheduled to run every 4 hours via EventBridge (10 *\/4 * * * — offset 10 min
 * from the top of the hour to avoid collision with other jobs).
 *
 * For every user with an active Stripe subscription:
 *   1. Fetches the current subscription status from Stripe
 *   2. Compares it against the status stored in the database
 *   3. If changed → updates the DB and sends a notification email
 *   4. If unchanged → updates the last_status_check_at timestamp
 *
 * Email opt-out:
 *   Notification emails respect user_settings.email_marketing_enabled.
 *   Users who have opted out will not receive billing notification emails.
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';
import { sendSubscriptionNotificationEmail } from '../shared/emailService.js';
import Stripe from 'stripe';

const logger         = createLogger('subscription-check');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const stripe         = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Stripe statuses that warrant a user-facing email notification
const NOTIFY_STATUSES = new Set(['past_due', 'canceled', 'incomplete', 'unpaid']);

// ─────────────────────────────────────────────
//  DATABASE HELPERS
// ─────────────────────────────────────────────

/**
 * Fetch up to 1,000 users who have a Stripe subscription, ordered by the
 * least-recently-checked first so every user gets attention over time.
 *
 * Also decrypts email and computes user_id_hash so we can send notifications
 * without extra round-trips.
 */
async function getAllUsersWithSubscriptions() {
  try {
    const { rows } = await db.query(
      `SELECT
         upi.user_id,
         upi.subscription_status,
         upi.current_period_start,
         upi.current_period_end,
         upi.last_status_check_at,
         pgp_sym_decrypt(upi.stripe_subscription_id_encrypted, $1) AS stripe_subscription_id,
         pgp_sym_decrypt(upi.email_encrypted, $1)                  AS email,
         encode(digest(upi.user_id, 'sha256'), 'hex')              AS user_id_hash
       FROM user_personal_info upi
       WHERE upi.stripe_subscription_id_encrypted IS NOT NULL
       ORDER BY upi.last_status_check_at ASC NULLS FIRST
       LIMIT 1000`,
      [ENCRYPTION_KEY]
    );
    return rows;
  } catch (error) {
    logger.errorFromCatch(error, 'getAllUsersWithSubscriptions');
    return [];
  }
}

/**
 * Write the latest Stripe subscription data back to the database.
 */
async function updateSubscriptionInDB(userId, sub) {
  await db.query(
    `UPDATE user_personal_info
        SET subscription_status    = $1,
            current_period_start   = to_timestamp($2),
            current_period_end     = to_timestamp($3),
            last_status_check_at   = CURRENT_TIMESTAMP,
            updated_at             = CURRENT_TIMESTAMP
      WHERE user_id = $4`,
    [sub.status, sub.current_period_start, sub.current_period_end, userId]
  );

  if (sub.status === 'canceled') {
    await db.query(
      `UPDATE user_personal_info
          SET subscription_cancelled_at = CURRENT_TIMESTAMP
        WHERE user_id = $1`,
      [userId]
    );
  }
}

/**
 * Touch last_status_check_at without changing any subscription data.
 * Called when the status hasn't changed so we know the user was checked.
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
    logger.errorFromCatch(error, 'updateLastStatusCheck', userId);
  }
}

// ─────────────────────────────────────────────
//  PER-USER CHECK
// ─────────────────────────────────────────────

/**
 * Check a single user's subscription against Stripe and take action if the
 * status has changed.
 *
 * @param {Object} user  - Row from getAllUsersWithSubscriptions()
 * @param {Object} stats - Mutable stats counters for this Lambda invocation
 */
async function checkUserSubscription(user, stats) {
  if (!user.stripe_subscription_id) {
    stats.skipped++;
    return;
  }

  // Fetch current data from Stripe
  const stripeSub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

  if (stripeSub.status === user.subscription_status) {
    // Status unchanged — just record that we checked
    await updateLastStatusCheck(user.user_id);
    return;
  }

  // Status changed — update the database
  stats.statusChanged++;
  await updateSubscriptionInDB(user.user_id, stripeSub);

  // Send a notification email for actionable statuses
  if (NOTIFY_STATUSES.has(stripeSub.status)) {
    try {
      const emailResult = await sendSubscriptionNotificationEmail(
        user.email,
        user.user_id_hash,
        stripeSub.status,
        null, // stripePortalLink — not generated here; email falls back to /billing
        db
      );

      if (emailResult.success) {
        stats.notificationsSent++;
      } else if (emailResult.skipped) {
        stats.notificationsSkipped++;
      }
    } catch (emailErr) {
      // Email failure must never abort the status-update loop
      logger.errorFromCatch(emailErr, 'Subscription notification email', user.user_id);
    }
  }
}

// ─────────────────────────────────────────────
//  LAMBDA HANDLER
// ─────────────────────────────────────────────

/**
 * Lambda entry point — invoked by EventBridge every 4 hours.
 *
 * @param {Object} event - EventBridge scheduled event
 * @returns {Object} HTTP-style response with run statistics
 */
export const handler = async (event) => {
  const startTime = Date.now();

  try {
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    if (!stripe) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    const stats = {
      totalUsersChecked:    0,
      statusChanged:        0,
      notificationsSent:    0,
      notificationsSkipped: 0, // opted-out users
      errors:               0,
      skipped:              0,
    };

    const users = await getAllUsersWithSubscriptions();
    stats.totalUsersChecked = users.length;

    if (users.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          stats,
          duration_ms: Date.now() - startTime,
          note: 'No users with subscriptions found',
        }),
      };
    }

    for (const user of users) {
      try {
        await checkUserSubscription(user, stats);
      } catch (error) {
        // Stripe API unreachable — log and continue so other users still get checked
        if (error.message?.includes('connect ENOTFOUND') || error.type === 'StripeConnectionError') {
          logger.errorFromCatch(error, 'Stripe API unreachable', user.user_id);
        } else {
          logger.errorFromCatch(error, 'checkUserSubscription', user.user_id);
        }
        stats.errors++;
      }
    }

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stats,
        duration_ms: duration,
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.errorFromCatch(error, 'Lambda handler');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: duration,
      }),
    };
  }
};

export default { handler };
