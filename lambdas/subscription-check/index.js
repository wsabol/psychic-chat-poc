/**
 * Subscription Check Lambda Function
 *
 * Scheduled to run once daily via EventBridge (0 1 * * *  — 01:00 UTC).
 * Real-time Google Play events are handled by the RTDN webhook endpoint; this
 * Lambda is a daily safety net that also covers Stripe subscriptions.
 *
 * For every user with an active Stripe subscription:
 *   1. Fetches the current subscription status from Stripe
 *   2. Compares it against the status stored in the database
 *   3. If changed → updates the DB and sends a notification email
 *   4. If unchanged → updates the last_status_check_at timestamp
 *
 * For every user with a Google Play subscription:
 *   1. Calls the Google Play Developer API with the stored purchase token
 *   2. Updates subscription_status and current_period_end if they've changed
 *   3. Falls back to time-based expiry check when API credentials aren't set
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
//  GOOGLE PLAY HELPERS
// ─────────────────────────────────────────────

/**
 * Calls the Google Play Developer API to verify a purchase token.
 * Returns null in sandbox mode (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not set).
 */
async function verifyGooglePlayToken(packageName, productId, purchaseToken) {
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    return null;
  }
  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(serviceAccountJson),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const androidPublisher = google.androidpublisher({ version: 'v3', auth });
  const response = await androidPublisher.purchases.subscriptions.get({
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });
  return response.data;
}

/**
 * Fetch Google Play subscribers who haven't been checked in the past 20 hours.
 */
async function getAllGooglePlayUsers() {
  try {
    const { rows } = await db.query(
      `SELECT user_id,
              subscription_status,
              current_period_end,
              google_play_purchase_token,
              google_play_product_id
       FROM user_personal_info
       WHERE billing_platform = 'google_play'
         AND google_play_purchase_token IS NOT NULL
         AND user_id NOT LIKE 'temp_%'
         AND (
           last_status_check_at IS NULL
           OR last_status_check_at < NOW() - INTERVAL '20 hours'
         )
       ORDER BY last_status_check_at ASC NULLS FIRST
       LIMIT 1000`
    );
    return rows;
  } catch (error) {
    logger.errorFromCatch(error, 'getAllGooglePlayUsers');
    return [];
  }
}

/**
 * Re-validate a single Google Play subscriber.
 * Updates the DB if the status or expiry has changed.
 */
async function checkGooglePlayUser(user, stats) {
  const {
    user_id: userId,
    subscription_status: currentStatus,
    google_play_purchase_token: purchaseToken,
    google_play_product_id: productId,
  } = user;

  const touch = () =>
    db.query(
      `UPDATE user_personal_info SET last_status_check_at = NOW() WHERE user_id = $1`,
      [userId]
    );

  let googleSubscription = null;
  try {
    googleSubscription = await verifyGooglePlayToken(
      'com.starshippsychicsmobile',
      productId,
      purchaseToken
    );
  } catch (err) {
    logger.errorFromCatch(err, 'checkGooglePlayUser-apiCall', userId);
  }

  if (!googleSubscription) {
    // No API credentials — fall back to time-based expiry
    const nowSeconds = Math.floor(Date.now() / 1000);
    const isExpired  = user.current_period_end && user.current_period_end < nowSeconds;
    if (isExpired && currentStatus === 'active') {
      await db.query(
        `UPDATE user_personal_info
         SET subscription_status  = 'expired',
             last_status_check_at = NOW(),
             updated_at           = NOW()
         WHERE user_id = $1`,
        [userId]
      );
      stats.statusChanged++;
    } else {
      await touch();
    }
    return;
  }

  const expiryMs       = parseInt(googleSubscription.expiryTimeMillis, 10);
  const isExpired      = expiryMs < Date.now();
  const paymentPending = googleSubscription.paymentState === 0;
  const newStatus      = (!isExpired && !paymentPending) ? 'active' : 'expired';
  const newPeriodEnd   = Math.floor(expiryMs / 1000);

  if (newStatus !== currentStatus || newPeriodEnd !== user.current_period_end) {
    stats.statusChanged++;
    await db.query(
      `UPDATE user_personal_info
       SET subscription_status  = $2,
           current_period_end   = $3,
           last_status_check_at = NOW(),
           updated_at           = NOW()
       WHERE user_id = $1`,
      [userId, newStatus, newPeriodEnd]
    );
  } else {
    await touch();
  }
}

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
         encode(digest(upi.user_id, 'sha256'), 'hex')              AS user_id_hash,
         COALESCE(up.language, 'en-US')                            AS language
       FROM user_personal_info upi
       LEFT JOIN user_preferences up
              ON up.user_id_hash = encode(digest(upi.user_id, 'sha256'), 'hex')
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
        db,
        user.language || 'en-US'
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
 * Lambda entry point — invoked by EventBridge once daily at 01:00 UTC.
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

    const stats = {
      totalUsersChecked:    0,
      statusChanged:        0,
      notificationsSent:    0,
      notificationsSkipped: 0, // opted-out users
      errors:               0,
      skipped:              0,
    };

    // ── Stripe subscriptions ──────────────────────────────────────────────────
    if (stripe) {
      const stripeUsers = await getAllUsersWithSubscriptions();
      stats.totalUsersChecked += stripeUsers.length;

      for (const user of stripeUsers) {
        try {
          await checkUserSubscription(user, stats);
        } catch (error) {
          if (error.message?.includes('connect ENOTFOUND') || error.type === 'StripeConnectionError') {
            logger.errorFromCatch(error, 'Stripe API unreachable', user.user_id);
          } else {
            logger.errorFromCatch(error, 'checkUserSubscription', user.user_id);
          }
          stats.errors++;
        }
      }
    } else {
      logger.errorFromCatch(
        new Error('STRIPE_SECRET_KEY not set — Stripe subscription check skipped'),
        'handler'
      );
    }

    // ── Google Play subscriptions ─────────────────────────────────────────────
    const googlePlayUsers = await getAllGooglePlayUsers();
    stats.totalUsersChecked += googlePlayUsers.length;

    for (const user of googlePlayUsers) {
      try {
        await checkGooglePlayUser(user, stats);
      } catch (error) {
        logger.errorFromCatch(error, 'checkGooglePlayUser', user.user_id);
        stats.errors++;
      }
    }

    if (stats.totalUsersChecked === 0) {
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
