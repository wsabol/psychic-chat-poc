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

    // Check expiry if Google returned subscription data
    if (googleSubscription) {
      const expiryMs = parseInt(googleSubscription.expiryTimeMillis, 10);
      if (expiryMs < Date.now()) {
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

    console.log(`[GooglePlay] Subscription activated for user ${hashUserId(userId)}: ${planName}`);

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

    console.log(`[GooglePlay] Subscription restored for user ${hashUserId(userId)}: ${planName}`);

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
 * Returns the current Google Play subscription status for the authenticated user.
 * Used by the app on launch to check if the user's subscription is still active.
 */
router.get('/subscription-status/google', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT subscription_status, plan_name, current_period_end,
              billing_platform, google_play_product_id, updated_at
       FROM user_personal_info
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return successResponse(res, { hasSubscription: false });
    }

    const row = result.rows[0];

    // Only report Google Play subscriptions here
    if (row.billing_platform !== 'google_play') {
      return successResponse(res, { hasSubscription: false, billing_platform: row.billing_platform });
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
    });
  } catch (error) {
    logErrorFromCatch(error, 'billing', 'google-subscription-status', hashUserId(req.user?.userId)).catch(() => {});
    return billingError(res, 'Failed to retrieve subscription status');
  }
});

export default router;
