/**
 * Subscription Check Job
 *
 * Runs once daily (scheduler: 0 1 * * * — 01:00 UTC) to verify active
 * subscriptions for ALL billing platforms:
 *
 *   Stripe users:
 *     - Fetches current subscription status from Stripe API
 *     - Updates database if status changed
 *     - Notifies users of issues (past_due, canceled, etc.)
 *
 *   Google Play users:
 *     - Re-validates the stored purchase token with the Google Play Developer API
 *     - Updates subscription_status and current_period_end if changed
 *     - Acts as a safety net in case the RTDN webhook was missed or delayed
 *     - The RTDN webhook handles real-time events; this job catches any gaps
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
import { hashUserId } from '../shared/hashUtils.js';

let jobRunning = false;
let lastRunTime = null;
let lastRunStats = {
  totalUsersChecked: 0,
  statusChanged: 0,
  notificationsSent: 0,
  errors: 0
};

// Number of Stripe API calls to run in parallel.
// Stripe's default rate limit is 100 req/s; 10 concurrent is safe and fast.
const STRIPE_CONCURRENCY = 10;

/**
 * Main job function - runs once daily at 01:00 UTC
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
    // ── Stripe subscriptions ─────────────────────────────────────────────────
    const stripeUsers = await getAllUsersWithSubscriptions();
    stats.totalUsersChecked += stripeUsers.length;

    for (let i = 0; i < stripeUsers.length; i += STRIPE_CONCURRENCY) {
      const batch = stripeUsers.slice(i, i + STRIPE_CONCURRENCY);
      await Promise.all(
        batch.map(async (user) => {
          try {
            await checkUserSubscription(user, stats);
          } catch (error) {
            logErrorFromCatch(error, 'job', 'subscription-check-job', user.user_id);
            stats.errors++;
          }
        })
      );
    }

    // ── Google Play subscriptions ────────────────────────────────────────────
    // Safety net: re-validates every Google Play subscription once per day
    // in case an RTDN webhook was missed or delayed.
    const googlePlayUsers = await getAllGooglePlayUsers();
    stats.totalUsersChecked += googlePlayUsers.length;

    for (let i = 0; i < googlePlayUsers.length; i += STRIPE_CONCURRENCY) {
      const batch = googlePlayUsers.slice(i, i + STRIPE_CONCURRENCY);
      await Promise.all(
        batch.map(async (user) => {
          try {
            await checkGooglePlaySubscription(user, stats);
          } catch (error) {
            logErrorFromCatch(error, 'job', 'google-play-subscription-check', user.user_id);
            stats.errors++;
          }
        })
      );
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

// ─── Google Play helpers ──────────────────────────────────────────────────────

/**
 * Calls the Google Play Developer API to fetch the current subscription state
 * for a stored purchase token.  Mirrors the same helper in googlePlay.js route.
 * Returns null when GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured (sandbox).
 */
async function verifyGooglePlayToken(packageName, productId, purchaseToken) {
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    return null; // sandbox — skip API call
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
 * Fetch all Google Play subscribers who haven't been checked in the past 20 hours.
 * (The job runs daily; 20h guard prevents re-checking users who were recently
 * updated by an RTDN webhook within the same day.)
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
    logErrorFromCatch(error, 'job', 'get-google-play-users');
    return [];
  }
}

/**
 * Re-validate a single Google Play subscriber against the Play Developer API.
 * Updates the DB if the status or expiry has changed.
 */
async function checkGooglePlaySubscription(user, stats) {
  const {
    user_id: userId,
    subscription_status: currentStatus,
    google_play_purchase_token: purchaseToken,
    google_play_product_id: productId,
  } = user;

  // Always touch last_status_check_at so the next daily run skips recently-checked users
  const touchTimestamp = async () => {
    await db.query(
      `UPDATE user_personal_info SET last_status_check_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  };

  // If we don't have Play API credentials, we can only do a time-based expiry check
  const googleSubscription = await verifyGooglePlayToken(
    'com.starshippsychicsmobile',
    productId,
    purchaseToken
  ).catch((err) => {
    logErrorFromCatch(err, 'job', 'google-play-api-verify', userId);
    return null;
  });

  if (!googleSubscription) {
    // ── No Google Play API credentials (sandbox / pre-production mode) ────────
    //
    // We CANNOT safely determine subscription status from current_period_end
    // alone for Google Play subscriptions.  Two important cases:
    //
    //   1. License tester (test) subscriptions auto-renew every 5–30 minutes.
    //      Their current_period_end is outdated within minutes of each renewal.
    //      If we mark them 'expired' here, the daily job would lock out testers
    //      a few minutes after they subscribed — even though their subscription
    //      is still technically active and auto-renewing.
    //
    //   2. Production subscriptions without a configured RTDN webhook also rely
    //      on this job for status updates.  Without ground-truth from Google's
    //      API we cannot distinguish a lapsed subscription from one that renewed
    //      successfully (the DB just hasn't been updated yet).
    //
    // Action: touch last_status_check_at only — do NOT change subscription_status.
    // The RTDN webhook (once configured) handles real-time status updates.
    // Once GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is set, this job provides a reliable
    // daily safety-net based on authoritative data from Google's API.
    await touchTimestamp();
    return;
  }

  // ── We have live data from Google — use it ────────────────────────────────
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
    await touchTimestamp();
  }
}

// ─── Stripe helpers ───────────────────────────────────────────────────────────

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
        pgp_sym_decrypt(stripe_subscription_id_encrypted, $1) as stripe_subscription_id,
        pgp_sym_decrypt(email_encrypted, $1) as email
      FROM user_personal_info
      WHERE stripe_subscription_id_encrypted IS NOT NULL
        AND user_id NOT LIKE 'temp_%'
        AND pgp_sym_decrypt(email_encrypted, $1) NOT LIKE '%@psychic.local'
      ORDER BY last_status_check_at ASC NULLS FIRST
      LIMIT 1000
    `;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY]);
    
    // Additional safety check: filter out any temp users that slipped through
    return result.rows.filter(user => 
      !user.user_id.startsWith('temp_') && 
      !user.email?.includes('@psychic.local')
    );
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
    schedule: 'Once daily at 01:00 UTC',
  };
}

export default {
  runSubscriptionCheckJob,
  getSubscriptionCheckJobStatus
};
