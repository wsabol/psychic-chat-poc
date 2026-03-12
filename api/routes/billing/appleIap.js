/**
 * Apple In-App Purchase (IAP) Routes
 *
 * Handles receipt validation, purchase restoration, and server-to-server
 * notifications for Apple App Store subscriptions.
 *
 * Endpoints:
 *   POST /billing/validate-receipt/apple       – Validate a StoreKit receipt from the app
 *   POST /billing/restore/apple                – Re-validate all active Apple receipts for a user
 *   POST /billing/apple/server-notifications   – Apple App Store Server Notifications (S2S)
 *
 * Apple receipt validation flow:
 *   1. App sends base64-encoded transactionReceipt to this endpoint
 *   2. We forward it to Apple's /verifyReceipt endpoint
 *      - Production: https://buy.itunes.apple.com/verifyReceipt
 *      - Sandbox:    https://sandbox.itunes.apple.com/verifyReceipt
 *   3. Apple returns the receipt status + latest_receipt_info
 *   4. We update user_personal_info with subscription status, period dates, etc.
 *
 * Environment variables required:
 *   APPLE_SHARED_SECRET   – App-specific shared secret from App Store Connect →
 *                           Your App → In-App Purchases → App-Specific Shared Secret
 *
 * Apple App Store Server Notifications (S2S):
 *   Configure in App Store Connect → Your App → App Information → App Store Server Notifications
 *   Set the URL to: https://api.starshippsychics.com/billing/apple/server-notifications
 *   Use Version 1 notifications (simpler format, well supported)
 *
 * Apple subscription status codes (status field in verifyReceipt response):
 *   0     = Valid receipt
 *   21000 = App Store cannot read the JSON object
 *   21002 = The data in the receipt-data property was malformed or missing
 *   21003 = The receipt could not be authenticated
 *   21005 = The receipt server is not currently available — retry
 *   21007 = This receipt is from the test environment (retry against sandbox)
 *   21008 = This receipt is from the production environment (retry against production)
 *   21010 = This receipt could not be authorized — treat as invalid
 */

import express from 'express';
import fetch from 'node-fetch';
import pool from '../../db.js';
import { authenticateToken } from '../../middleware/auth.js';
import { logger } from '../../shared/logger.js';

const router = express.Router();

const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX    = 'https://sandbox.itunes.apple.com/verifyReceipt';

// ─── Helper: verify receipt against Apple ──────────────────────────────────

async function verifyReceiptWithApple(receiptData, useSandbox = false) {
  const url = useSandbox ? APPLE_VERIFY_URL_SANDBOX : APPLE_VERIFY_URL_PRODUCTION;
  const sharedSecret = process.env.APPLE_SHARED_SECRET;

  if (!sharedSecret) {
    throw new Error('APPLE_SHARED_SECRET environment variable is not set');
  }

  const body = {
    'receipt-data': receiptData,
    password: sharedSecret,
    'exclude-old-transactions': true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Apple verifyReceipt HTTP error: ${response.status}`);
  }

  return response.json();
}

// ─── Helper: get the most recent active subscription info from Apple receipt ──

function getLatestReceiptInfo(receiptResponse) {
  const latestInfo = receiptResponse.latest_receipt_info;
  if (!Array.isArray(latestInfo) || latestInfo.length === 0) {
    return null;
  }

  // Sort by expires_date_ms descending — take the latest one
  const sorted = [...latestInfo].sort(
    (a, b) => parseInt(b.expires_date_ms, 10) - parseInt(a.expires_date_ms, 10),
  );
  return sorted[0];
}

// ─── Helper: determine plan name from Apple product ID ──────────────────────

function getPlanFromProductId(productId) {
  if (!productId) return null;
  if (productId.includes('annual')) return 'annual';
  if (productId.includes('monthly')) return 'monthly';
  return productId;
}

// ─── Helper: update DB with Apple subscription info ────────────────────────

async function updateSubscriptionFromAppleReceipt(userId, receiptInfo, latestReceiptBase64) {
  if (!receiptInfo) {
    return;
  }

  const productId    = receiptInfo.product_id;
  const expiresMs    = parseInt(receiptInfo.expires_date_ms, 10);
  const purchaseMs   = parseInt(receiptInfo.original_purchase_date_ms, 10);
  const isExpired    = Date.now() > expiresMs;
  const plan         = getPlanFromProductId(productId);
  const status       = isExpired ? 'expired' : 'active';

  // current_period_start / _end stored as Unix timestamps (seconds, matching Stripe)
  const periodStart = Math.floor(purchaseMs / 1000);
  const periodEnd   = Math.floor(expiresMs / 1000);

  await pool.query(
    `UPDATE user_personal_info
     SET
       subscription_status             = $1,
       plan_name                       = $2,
       current_period_start            = $3,
       current_period_end              = $4,
       billing_platform                = 'apple',
       apple_original_transaction_id   = $5,
       apple_latest_receipt            = $6,
       apple_product_id                = $7,
       last_status_check_at            = NOW()
     WHERE user_id = $8`,
    [
      status,
      plan,
      periodStart,
      periodEnd,
      receiptInfo.original_transaction_id ?? null,
      latestReceiptBase64 ?? null,
      productId ?? null,
      userId,
    ],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /billing/validate-receipt/apple
//
// Called by the mobile app after a successful StoreKit purchase.
// Body: { receipt: <base64 string>, productId: string, transactionId?: string }
// ─────────────────────────────────────────────────────────────────────────────

router.post('/validate-receipt/apple', authenticateToken, async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { receipt, productId, transactionId } = req.body;
  if (!receipt) {
    return res.status(400).json({ error: 'receipt is required' });
  }

  try {
    // Try production first; Apple returns status 21007 for sandbox receipts
    let appleResponse = await verifyReceiptWithApple(receipt, false);

    if (appleResponse.status === 21007) {
      // Sandbox receipt — retry against sandbox endpoint
      logger.info('[AppleIAP] Switching to sandbox for receipt validation');
      appleResponse = await verifyReceiptWithApple(receipt, true);
    }

    if (appleResponse.status !== 0) {
      logger.warn('[AppleIAP] Invalid receipt status:', appleResponse.status);
      return res.status(400).json({
        error: 'Invalid receipt',
        appleStatus: appleResponse.status,
      });
    }

    const receiptInfo = getLatestReceiptInfo(appleResponse);
    const latestReceiptBase64 = appleResponse.latest_receipt ?? receipt;

    await updateSubscriptionFromAppleReceipt(userId, receiptInfo, latestReceiptBase64);

    logger.info('[AppleIAP] Receipt validated successfully for user:', userId);
    res.json({
      success: true,
      plan: getPlanFromProductId(receiptInfo?.product_id),
      expiresAt: receiptInfo?.expires_date_ms
        ? new Date(parseInt(receiptInfo.expires_date_ms, 10)).toISOString()
        : null,
    });
  } catch (error) {
    logger.error('[AppleIAP] validate-receipt error:', error);
    res.status(500).json({ error: 'Failed to validate receipt' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /billing/restore/apple
//
// Called when the user taps "Restore Purchases" and the app sends the current
// App Store receipt for re-validation.
// Body: { receipt: <base64 string> }
// ─────────────────────────────────────────────────────────────────────────────

router.post('/restore/apple', authenticateToken, async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { receipt } = req.body;
  if (!receipt) {
    return res.status(400).json({ error: 'receipt is required' });
  }

  try {
    let appleResponse = await verifyReceiptWithApple(receipt, false);
    if (appleResponse.status === 21007) {
      appleResponse = await verifyReceiptWithApple(receipt, true);
    }

    if (appleResponse.status !== 0) {
      return res.status(400).json({
        error: 'No valid purchases found',
        appleStatus: appleResponse.status,
      });
    }

    const receiptInfo = getLatestReceiptInfo(appleResponse);
    if (!receiptInfo) {
      return res.status(404).json({ error: 'No active subscription found for this Apple ID' });
    }

    const latestReceiptBase64 = appleResponse.latest_receipt ?? receipt;
    await updateSubscriptionFromAppleReceipt(userId, receiptInfo, latestReceiptBase64);

    const isExpired = Date.now() > parseInt(receiptInfo.expires_date_ms, 10);

    res.json({
      success: true,
      restored: !isExpired,
      plan: getPlanFromProductId(receiptInfo.product_id),
      expiresAt: new Date(parseInt(receiptInfo.expires_date_ms, 10)).toISOString(),
    });
  } catch (error) {
    logger.error('[AppleIAP] restore error:', error);
    res.status(500).json({ error: 'Failed to restore purchases' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /billing/apple/server-notifications
//
// Apple App Store Server Notifications (S2S) webhook.
// Apple sends these automatically when a subscription renews, expires, is
// cancelled, goes into a billing retry period, etc.
//
// No authentication header — Apple posts to a public URL. We verify the
// receipt included in the payload as a secondary check.
//
// Configure in: App Store Connect → Your App → App Information →
//               App Store Server Notifications URL
// ─────────────────────────────────────────────────────────────────────────────

router.post('/apple/server-notifications', async (req, res) => {
  const notification = req.body;

  // Apple always sends 200 immediately — acknowledge first, process async
  res.status(200).json({ received: true });

  try {
    const notificationType = notification.notification_type;
    const latestReceiptInfo = notification.latest_receipt_info;
    const latestReceipt     = notification.latest_receipt;
    const originalTransactionId = latestReceiptInfo?.original_transaction_id;

    logger.info('[AppleIAP] S2S notification:', notificationType, originalTransactionId);

    if (!originalTransactionId) {
      logger.warn('[AppleIAP] S2S notification missing original_transaction_id');
      return;
    }

    // Find the user who has this Apple transaction
    const userResult = await pool.query(
      `SELECT user_id FROM user_personal_info
       WHERE apple_original_transaction_id = $1
       LIMIT 1`,
      [originalTransactionId],
    );

    if (userResult.rows.length === 0) {
      logger.warn('[AppleIAP] S2S: no user found for transaction:', originalTransactionId);
      return;
    }

    const userId = userResult.rows[0].user_id;

    switch (notificationType) {
      case 'INITIAL_BUY':
      case 'DID_RENEW':
      case 'DID_RECOVER':
      case 'INTERACTIVE_RENEWAL': {
        // Subscription is active — update with latest receipt info
        await updateSubscriptionFromAppleReceipt(userId, latestReceiptInfo, latestReceipt);
        break;
      }

      case 'CANCEL':
      case 'DID_FAIL_TO_RENEW':
      case 'REVOKE': {
        // Subscription is no longer active
        await pool.query(
          `UPDATE user_personal_info
           SET subscription_status = 'expired',
               last_status_check_at = NOW()
           WHERE user_id = $1`,
          [userId],
        );
        break;
      }

      case 'DID_CHANGE_RENEWAL_STATUS': {
        // Auto-renewal turned off (user cancelled but still in paid period)
        const autoRenewStatus = notification.auto_renew_status;
        if (autoRenewStatus === 'false' || autoRenewStatus === false) {
          await pool.query(
            `UPDATE user_personal_info
             SET subscription_cancelled_at = NOW(),
                 last_status_check_at = NOW()
             WHERE user_id = $1`,
            [userId],
          );
        }
        break;
      }

      default:
        logger.info('[AppleIAP] S2S: unhandled notification type:', notificationType);
    }
  } catch (error) {
    logger.error('[AppleIAP] S2S notification error:', error);
    // Already sent 200 — log and move on
  }
});

export default router;
