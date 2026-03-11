/**
 * Google Play Billing Routes
 *
 * Handles server-side validation of Google Play purchase tokens and
 * subscription restore requests from Android clients.
 *
 * Google's Test Environment (equivalent to Stripe's sandbox):
 *   - Add tester email addresses in Play Console > Setup > License testing
 *   - Those accounts can purchase subscriptions for free in any environment
 *   - Test purchase tokens are real tokens that Google validates normally
 *   - Use the TEST static responses (android.test.purchased, etc.) for basic smoke tests
 *
 * For production: set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in your secrets
 * so the backend can call the Google Play Developer API to verify tokens.
 */
import crypto from 'crypto';
import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { successResponse, billingError, validationError } from '../../utils/responses.js';
import { db } from '../../shared/db.js';

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map a Google Play product ID to an internal plan name.
 */
const PRODUCT_TO_PLAN = {
  starship_psychics_monthly: 'monthly',
  starship_psychics_annual: 'annual',
};

/**
 * Calls the Google Play Developer API to verify a purchase token.
 * Requires GOOGLE_PLAY_SERVICE_ACCOUNT_JSON environment variable to be set.
 *
 * Returns the subscription resource from Google, or null if validation is
 * skipped (sandbox / missing credentials).
 */
async function verifyWithGooglePlayAPI(packageName, productId, purchaseToken) {
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    // Sandbox / development: skip Google API verification.
    // Purchases are accepted on the strength of the purchase token alone.
    // Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in production to enable full validation.
    console.warn(
      '[GooglePlay] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not set — ' +
        'skipping Play Developer API verification (sandbox mode)'
    );
    return null;
  }

  // Dynamic import so the module is only loaded when credentials are present
  const { google } = await import('googleapis');

  const serviceAccount = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
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

// ─── POST /billing/validate-receipt/google ────────────────────────────────────
/**
 * Called by the mobile app immediately after a successful Google Play purchase.
 * Validates the purchase token (via Google Play Developer API when credentials
 * are available) and activates the subscription in our database.
 */
router.post('/validate-receipt/google', authenticateToken, async (req, res) => {
  try {
    const { purchaseToken, productId, orderId, packageName } = req.body;
    const userId = req.user.userId;

    if (!purchaseToken || !productId) {
      return validationError(res, 'purchaseToken and productId are required');
    }

    if (!PRODUCT_TO_PLAN[productId]) {
      return validationError(res, `Unknown productId: ${productId}`);
    }

    const planName = PRODUCT_TO_PLAN[productId];

    // ── Optional: verify with Google Play Developer API ──────────────────────
    let googleSubscription = null;
    try {
      googleSubscription = await verifyWithGooglePlayAPI(
        packageName || 'com.starshippsychicsmobile',
        productId,
        purchaseToken
      );
    } catch (verifyError) {
      // Non-fatal in sandbox: log and continue
      console.error('[GooglePlay] Play API verification failed:', verifyError.message);
    }

    // Check expiry if Google returned subscription data.
    //
    // ⚠️  IMPORTANT — License tester / test subscription timing:
    //   Google Play license testers purchase subscriptions for $0.00.  The
    //   INITIAL period of a test subscription is very short:
    //     • Monthly plan: ~5 minutes
    //     • Annual plan:  ~30 minutes
    //   After each period the subscription auto-renews (up to 6 times), each
    //   renewal also lasting only a few minutes.
    //
    //   Network latency between the in-app purchase and this backend validation
    //   endpoint (DNS lookup, TLS handshake, auth token exchange, etc.) can
    //   easily exceed the remaining time on a 5-minute test period.  Without a
    //   grace window the backend would reject a valid test purchase with
    //   "subscription has already expired" — leaving the tester locked out.
    //
    // We apply a 5-minute grace period so a test subscription that expires
    // mere seconds before validation arrives is still accepted.  Production
    // subscriptions are unaffected (their periods are months long).
    const EXPIRY_GRACE_MS = 5 * 60 * 1000; // 5 minutes

    if (googleSubscription) {
      const expiryMs = parseInt(googleSubscription.expiryTimeMillis, 10);
      if (expiryMs < Date.now() - EXPIRY_GRACE_MS) {
        return billingError(res, 'Google Play subscription has already expired');
      }
    }

    // ── Store / update subscription in user_personal_info ───────────────────
    // current_period_end is stored as Unix epoch seconds (INTEGER) to match
    // the existing Stripe convention in this schema.
    const expiryMs = googleSubscription
      ? parseInt(googleSubscription.expiryTimeMillis, 10)
      : null;
    const currentPeriodEnd = expiryMs ? Math.floor(expiryMs / 1000) : null;
    const currentPeriodStart = googleSubscription
      ? Math.floor(parseInt(googleSubscription.startTimeMillis, 10) / 1000)
      : Math.floor(Date.now() / 1000);

    await db.query(
      `UPDATE user_personal_info
       SET subscription_status       = 'active',
           plan_name                 = $2,
           current_period_start      = $3,
           current_period_end        = $4,
           billing_platform          = 'google_play',
           google_play_purchase_token = $5,
           google_play_product_id    = $6,
           google_play_order_id      = $7,
           last_status_check_at      = NOW(),
           updated_at                = NOW()
       WHERE user_id = $1`,
      [userId, planName, currentPeriodStart, currentPeriodEnd,
       purchaseToken, productId, orderId || null]
    );

    return successResponse(res, {
      success: true,
      plan: planName,
      status: 'active',
    });
  } catch (error) {
    logErrorFromCatch(error, 'billing', 'google-validate-receipt', hashUserId(req.user?.userId)).catch(() => {});
    return billingError(res, error.message || 'Failed to validate Google Play receipt');
  }
});

// ─── POST /billing/restore-purchases/google ───────────────────────────────────
/**
 * Called when the user taps "Restore Purchases" on Android.
 * Re-validates the purchase token with Google and re-activates the subscription
 * in our database if the subscription is still active.
 */
router.post('/restore-purchases/google', authenticateToken, async (req, res) => {
  try {
    const { purchaseToken, productId, orderId, packageName } = req.body;
    const userId = req.user.userId;

    if (!purchaseToken || !productId) {
      return validationError(res, 'purchaseToken and productId are required');
    }

    if (!PRODUCT_TO_PLAN[productId]) {
      return validationError(res, `Unknown productId: ${productId}`);
    }

    const planName = PRODUCT_TO_PLAN[productId];

    // Verify with Google Play Developer API (if credentials are available)
    let googleSubscription = null;
    try {
      googleSubscription = await verifyWithGooglePlayAPI(
        packageName || 'com.starshippsychicsmobile',
        productId,
        purchaseToken
      );
    } catch (verifyError) {
      console.error('[GooglePlay] Play API verification failed during restore:', verifyError.message);
    }

    // In sandbox mode (no credentials), accept the restore unconditionally
    const isActive = googleSubscription
      ? parseInt(googleSubscription.expiryTimeMillis, 10) > Date.now()
      : true;

    if (!isActive) {
      return billingError(res, 'The subscription has expired and cannot be restored');
    }

    const expiryMs = googleSubscription
      ? parseInt(googleSubscription.expiryTimeMillis, 10)
      : null;
    const currentPeriodEnd = expiryMs ? Math.floor(expiryMs / 1000) : null;
    const currentPeriodStart = googleSubscription
      ? Math.floor(parseInt(googleSubscription.startTimeMillis, 10) / 1000)
      : Math.floor(Date.now() / 1000);

    await db.query(
      `UPDATE user_personal_info
       SET subscription_status        = 'active',
           plan_name                  = $2,
           current_period_start       = $3,
           current_period_end         = $4,
           billing_platform           = 'google_play',
           google_play_purchase_token = $5,
           google_play_product_id     = $6,
           google_play_order_id       = $7,
           last_status_check_at       = NOW(),
           updated_at                 = NOW()
       WHERE user_id = $1`,
      [userId, planName, currentPeriodStart, currentPeriodEnd,
       purchaseToken, productId, orderId || null]
    );

    return successResponse(res, {
      success: true,
      plan: planName,
      status: 'active',
      restored: true,
    });
  } catch (error) {
    logErrorFromCatch(error, 'billing', 'google-restore-purchases', hashUserId(req.user?.userId)).catch(() => {});
    return billingError(res, error.message || 'Failed to restore Google Play purchases');
  }
});

// ─── GET /billing/subscription-status/google ─────────────────────────────────
/**
 * Returns the current subscription status for the authenticated user.
 *
 * Lookup order:
 *   1. By Firebase UID (user_id)  — fast path for users who registered normally.
 *   2. By email_hash (SHA-256 of lowercase email) — fallback for users who
 *      created their account on the web (Stripe) and later signed into the
 *      mobile app with a different Firebase identity (e.g. email/password on
 *      web vs Google Sign-In on mobile).  In that case their Stripe subscription
 *      is stored under the web UID, so the UID lookup returns 0 rows even though
 *      an active subscription exists in the database.
 *
 * Used by the app on launch to check if the user's subscription is still active.
 */
router.get('/subscription-status/google', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    let result = await db.query(
      `SELECT subscription_status, plan_name, current_period_end,
              billing_platform, google_play_product_id,
              google_play_purchase_token, updated_at
       FROM user_personal_info
       WHERE user_id = $1`,
      [userId]
    );

    // ── Email-hash fallback ───────────────────────────────────────────────────
    // If the UID lookup returns no row (or a row with no subscription data) and
    // the Firebase token carries a verified email, try to find the user by their
    // email_hash.  This handles the "web Stripe + mobile Google Sign-In" mismatch
    // where the same person has two separate Firebase UIDs.
    //
    // email_hash is SHA-256(lower(email)), matching the format written at
    // registration time (see auth-firebase route / user_personal_info DDL).
    const noRow = result.rows.length === 0;
    const rowHasNoSub =
      result.rows.length > 0 &&
      (!result.rows[0].subscription_status || result.rows[0].subscription_status === 'inactive');

    if ((noRow || rowHasNoSub) && req.user.email && req.user.emailVerified) {
      const emailHash = crypto
        .createHash('sha256')
        .update(req.user.email.toLowerCase())
        .digest('hex');

      const emailResult = await db.query(
        `SELECT subscription_status, plan_name, current_period_end,
                billing_platform, google_play_product_id,
                google_play_purchase_token, updated_at
         FROM user_personal_info
         WHERE email_hash = $1
           AND subscription_status = 'active'`,
        [emailHash]
      );

      if (emailResult.rows.length > 0) {
        console.info(
          `[SubscriptionStatus] Email-hash fallback matched for uid=${userId} — ` +
          'returning subscription from matched account'
        );
        result = emailResult;
      }
    }

    if (result.rows.length === 0) {
      return successResponse(res, { hasSubscription: false });
    }

    const row = result.rows[0];

    // Handle non-Google Play subscriptions (e.g. Stripe web purchases).
    // Stripe manages its own subscription lifecycle via webhooks which keep
    // subscription_status accurate.  We trust subscription_status = 'active'
    // directly rather than re-checking current_period_end, because:
    //   1. The Stripe webhook updates subscription_status to 'past_due' /
    //      'canceled' / 'unpaid' when a period ends without renewal.
    //   2. current_period_end may legitimately be a past timestamp during the
    //      brief window between an automatic renewal and the webhook arriving,
    //      which incorrectly flags the subscription as expired.
    if (row.billing_platform !== 'google_play') {
      const isActive = row.subscription_status === 'active';
      return successResponse(res, {
        hasSubscription: isActive,
        plan: row.plan_name ?? null,
        status: row.subscription_status ?? 'inactive',
        billing_platform: row.billing_platform || 'stripe',
        expiresAt: row.current_period_end
          ? new Date(row.current_period_end * 1000).toISOString()
          : null,
        // No purchaseToken for Stripe/non-Google subscriptions
        purchaseToken: null,
        productId: null,
      });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const isExpired = row.current_period_end && row.current_period_end < nowSeconds;

    return successResponse(res, {
      hasSubscription: row.subscription_status === 'active' && !isExpired,
      plan: row.plan_name,
      status: isExpired ? 'expired' : row.subscription_status,
      expiresAt: row.current_period_end
        ? new Date(row.current_period_end * 1000).toISOString()
        : null,
      // purchaseToken is returned to the authenticated owner so the app can
      // use it as the `oldPurchaseToken` when upgrading / downgrading plans.
      purchaseToken: row.google_play_purchase_token ?? null,
      productId: row.google_play_product_id ?? null,
    });
  } catch (error) {
    logErrorFromCatch(error, 'billing', 'google-subscription-status', hashUserId(req.user?.userId)).catch(() => {});
    return billingError(res, 'Failed to retrieve subscription status');
  }
});

// ─── POST /billing/google-play-rtdn ──────────────────────────────────────────
/**
 * Google Play Real-Time Developer Notifications (RTDN) endpoint.
 *
 * Google Cloud Pub/Sub calls this endpoint whenever a subscription lifecycle
 * event occurs on any user's account (auto-renewal, cancellation, expiry, etc.).
 * Our database is updated immediately so both the mobile app AND the web app
 * see the correct subscription status without the user having to open the app.
 *
 * Setup (one-time, in Google Cloud Console):
 *   1. Create a Pub/Sub topic in the same GCP project as the Play Console app.
 *   2. In Play Console → Monetize → Subscriptions → Real-time developer notifications,
 *      enter the topic name.
 *   3. Create a Pub/Sub PUSH subscription pointing to:
 *        https://<your-api-domain>/billing/google-play-rtdn?token=<GOOGLE_PLAY_PUBSUB_TOKEN>
 *   4. Set GOOGLE_PLAY_PUBSUB_TOKEN in your API secrets (any random secret string).
 *
 * Google Play notificationType values:
 *   1  = SUBSCRIPTION_RECOVERED        (billing recovered after account hold)
 *   2  = SUBSCRIPTION_RENEWED          ← the main one: auto-renewal succeeded
 *   3  = SUBSCRIPTION_CANCELED
 *   4  = SUBSCRIPTION_PURCHASED        (already handled by validate-receipt/google)
 *   5  = SUBSCRIPTION_ON_HOLD          (payment failed, within grace period)
 *   6  = SUBSCRIPTION_IN_GRACE_PERIOD
 *   7  = SUBSCRIPTION_RESTARTED        (user re-enables a paused subscription)
 *   8  = SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
 *   9  = SUBSCRIPTION_DEFERRED
 *   10 = SUBSCRIPTION_PAUSED
 *   11 = SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
 *   12 = SUBSCRIPTION_REVOKED
 *   13 = SUBSCRIPTION_EXPIRED
 */
router.post('/google-play-rtdn', express.json(), async (req, res) => {
  try {
    // ── Validate Pub/Sub bearer token ─────────────────────────────────────────
    // Pub/Sub appends ?token=<value> to the push URL.  We compare it against
    // GOOGLE_PLAY_PUBSUB_TOKEN to ensure the request is genuinely from Google.
    const expectedToken = process.env.GOOGLE_PLAY_PUBSUB_TOKEN;
    if (expectedToken) {
      const providedToken = req.query.token;
      if (providedToken !== expectedToken) {
        console.warn('[GooglePlay RTDN] Rejected: invalid Pub/Sub token');
        // Return 200 anyway — a 4xx would cause Pub/Sub to retry forever
        return res.status(200).json({ received: true, error: 'unauthorized' });
      }
    }

    // ── Decode the Pub/Sub message ────────────────────────────────────────────
    const message = req.body?.message;
    if (!message?.data) {
      // Empty / malformed message — acknowledge so Pub/Sub stops retrying
      return res.status(200).json({ received: true });
    }

    let notification;
    try {
      const decoded = Buffer.from(message.data, 'base64').toString('utf8');
      notification = JSON.parse(decoded);
    } catch {
      console.error('[GooglePlay RTDN] Failed to decode Pub/Sub payload');
      return res.status(200).json({ received: true });
    }

    // Only process subscription notifications (not one-time purchases / voided purchases)
    const subNotif = notification.subscriptionNotification;
    if (!subNotif) {
      return res.status(200).json({ received: true });
    }

    const { purchaseToken, subscriptionId, notificationType } = subNotif;
    const packageName = notification.packageName || 'com.starshippsychicsmobile';

    if (!purchaseToken || !subscriptionId) {
      return res.status(200).json({ received: true });
    }

    // ── Find the user who owns this purchase token ────────────────────────────
    const userResult = await db.query(
      `SELECT user_id
       FROM user_personal_info
       WHERE google_play_purchase_token = $1
         AND billing_platform = 'google_play'`,
      [purchaseToken]
    );

    if (userResult.rows.length === 0) {
      // Token not in our DB yet — could be a brand-new purchase that the mobile
      // app's validate-receipt/google call hasn't arrived for yet.  Log and
      // acknowledge (the app will call validate-receipt/google momentarily).
      console.warn(
        `[GooglePlay RTDN] No user found for purchase token (type=${notificationType}) — ` +
        'possibly a new purchase not yet validated by the app'
      );
      return res.status(200).json({ received: true });
    }

    const userId = userResult.rows[0].user_id;

    // ── Fetch ground-truth from the Google Play Developer API ─────────────────
    let googleSubscription = null;
    try {
      googleSubscription = await verifyWithGooglePlayAPI(packageName, subscriptionId, purchaseToken);
    } catch (apiErr) {
      console.error('[GooglePlay RTDN] Play Developer API call failed:', apiErr.message);
      // Fall back to inferring status from the notification type alone
    }

    // ── Determine the new subscription status ─────────────────────────────────
    // Notification types that mean the subscription should be considered active:
    const ACTIVE_NOTIFICATION_TYPES   = new Set([1, 2, 4, 7, 8]); // recovered, renewed, purchased, restarted, price-confirmed
    // Types that mean payment is delayed but we keep access (grace period / on-hold):
    const GRACE_NOTIFICATION_TYPES    = new Set([5, 6]);            // on_hold, in_grace_period
    // Types that mean the subscription is definitively inactive:
    const INACTIVE_NOTIFICATION_TYPES = new Set([3, 10, 12, 13]);  // canceled, paused, revoked, expired

    let newStatus;
    let currentPeriodEnd   = null;
    let currentPeriodStart = null;

    if (googleSubscription) {
      // Google API returned authoritative data — use it
      const expiryMs       = parseInt(googleSubscription.expiryTimeMillis, 10);
      const isExpired      = expiryMs < Date.now();
      // paymentState: 0=pending, 1=received, 2=free-trial, 3=deferred
      const paymentPending = googleSubscription.paymentState === 0;
      newStatus            = (!isExpired && !paymentPending) ? 'active' : 'expired';
      currentPeriodEnd     = Math.floor(expiryMs / 1000);
      if (googleSubscription.startTimeMillis) {
        currentPeriodStart = Math.floor(parseInt(googleSubscription.startTimeMillis, 10) / 1000);
      }
    } else if (ACTIVE_NOTIFICATION_TYPES.has(notificationType)) {
      newStatus = 'active';
    } else if (GRACE_NOTIFICATION_TYPES.has(notificationType)) {
      // Keep 'active' during grace period so the user isn't locked out while
      // Google retries payment.  The next RTDN will update once resolved.
      newStatus = 'active';
    } else if (INACTIVE_NOTIFICATION_TYPES.has(notificationType)) {
      newStatus = notificationType === 10 ? 'paused' : 'canceled';
    } else {
      // Unknown type — don't update; just acknowledge
      return res.status(200).json({ received: true });
    }

    // ── Write the updated status to the database ──────────────────────────────
    await db.query(
      `UPDATE user_personal_info
       SET subscription_status  = $2,
           current_period_start = COALESCE($3, current_period_start),
           current_period_end   = COALESCE($4, current_period_end),
           last_status_check_at = NOW(),
           updated_at           = NOW()
       WHERE user_id = $1`,
      [userId, newStatus, currentPeriodStart, currentPeriodEnd]
    );

    // Record cancellation timestamp when the subscription is definitively cancelled
    if (newStatus === 'canceled') {
      await db.query(
        `UPDATE user_personal_info
         SET subscription_cancelled_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
    }

    // Always respond 200 to acknowledge the Pub/Sub message.
    // A non-2xx would cause Pub/Sub to retry with exponential backoff.
    return res.status(200).json({ received: true });

  } catch (error) {
    logErrorFromCatch(error, 'billing', 'google-play-rtdn').catch(() => {});
    // Return 200 to prevent Pub/Sub retry storm on transient errors
    return res.status(200).json({ received: true, error: 'internal_error' });
  }
});

export default router;
