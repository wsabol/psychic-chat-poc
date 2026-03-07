/**
 * Deletion Business Logic
 *
 * Exports:
 *   getSubscriptionPeriodEnd       – Resolve grace-period end from Stripe subscription data
 *   processDeletionRequest         – Shared orchestration: subscription end → mark DB → cancel Stripe
 *   cancelStripeSubscriptionAtPeriodEnd
 *   reactivateStripeSubscription
 *   deleteFromFirebase
 *   deleteFromStripe
 *   deleteAllUserData
 *   performCompleteAccountDeletion
 */

import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { getAuth } from 'firebase-admin/auth';
import {
  fetchStripeCustomerId,
  deleteFromTable,
  logDeletionAudit,
  DELETION_TABLES,
  anonymizeUserPII,
  markAccountForDeletion,
} from './queries.js';
import { decryptStripeCustomerId } from './dataDecryption.js';
import { getStoredSubscriptionData } from '../../../services/stripe/database.js';
import { cancelSubscription } from '../../../services/stripe/subscriptions.js';
import { stripe } from '../../../services/stripe/stripeClient.js';

// ─── Subscription Helpers ─────────────────────────────────────────────────────

/**
 * Derive the grace-period end date from the user's active subscription.
 *
 * Checks BOTH billing platforms:
 *   • Google Play – reads `billing_platform`, `subscription_status`, and
 *                   `current_period_end` (Unix seconds) directly from
 *                   user_personal_info (already kept up-to-date by the RTDN
 *                   webhook and the daily subscription-check job).
 *   • Stripe      – uses the existing getStoredSubscriptionData() helper.
 *
 * Returns an ISO-8601 string, or null if no active subscription is found.
 *
 * @param {string} userId
 * @returns {Promise<string|null>} ISO date string or null
 */
export async function getSubscriptionPeriodEnd(userId) {
  try {
    // ── Step 1: detect billing platform ──────────────────────────────────────
    const platformResult = await db.query(
      `SELECT billing_platform, subscription_status, current_period_end
       FROM user_personal_info
       WHERE user_id = $1`,
      [userId]
    );

    if (platformResult.rows.length === 0) return null;
    const userRecord = platformResult.rows[0];

    // ── Step 2a: Google Play path ─────────────────────────────────────────────
    // Google Play subscriptions cannot be cancelled server-side via API
    // (unlike Stripe).  The user must cancel in the Play Store themselves.
    // We still set the grace period to the subscription's expiry date so the
    // account stays active until the end of the paid period (no refunds).
    if (userRecord.billing_platform === 'google_play') {
      const activeStatuses = ['active', 'trialing'];
      if (!activeStatuses.includes(userRecord.subscription_status)) return null;
      if (!userRecord.current_period_end) return null;

      // current_period_end is stored as a Unix timestamp in seconds.
      const periodEndMs = userRecord.current_period_end * 1000;
      const periodEnd = new Date(periodEndMs);
      if (isNaN(periodEnd.getTime()) || periodEnd <= new Date()) return null;

      return periodEnd.toISOString();
    }

    // ── Step 2b: Stripe path (original logic) ────────────────────────────────
    const subscriptionData = await getStoredSubscriptionData(userId);
    if (!subscriptionData) return null;

    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(subscriptionData.subscription_status)) return null;

    if (!subscriptionData.current_period_end) return null;

    // current_period_end may be a Unix timestamp (number) or a JS Date string.
    const periodEndMs =
      typeof subscriptionData.current_period_end === 'number'
        ? subscriptionData.current_period_end * 1000           // Stripe Unix → ms
        : new Date(subscriptionData.current_period_end).getTime(); // already a date

    const periodEnd = new Date(periodEndMs);
    if (isNaN(periodEnd.getTime()) || periodEnd <= new Date()) return null;

    return periodEnd.toISOString();
  } catch (err) {
    logErrorFromCatch(err, 'user-data-deletion', 'getSubscriptionPeriodEnd');
    return null;
  }
}

/**
 * Cancel the user's active Stripe subscription at the end of the current period.
 * This prevents any future charges while preserving access until period end.
 *
 * Uses `cancel_at_period_end: true` so the subscription stays "active" until the
 * billing period ends, then stops. The Stripe customer record is NOT deleted here —
 * it is deleted later by performCompleteAccountDeletion when the account is finally
 * anonymized (at anonymization_date / grace period end).
 *
 * @param {string} userId
 * @returns {Promise<{success: boolean, subscription_id?: string, period_end?: number, message?: string, error?: string}>}
 */
export async function cancelStripeSubscriptionAtPeriodEnd(userId) {
  try {
    const subscriptionData = await getStoredSubscriptionData(userId);

    if (!subscriptionData?.stripe_subscription_id) {
      return { success: true, message: 'No active subscription found' };
    }

    // Only cancel if the subscription is in a cancellable state.
    const cancellableStatuses = ['active', 'trialing', 'past_due'];
    if (!cancellableStatuses.includes(subscriptionData.subscription_status)) {
      return {
        success: true,
        message: `Subscription already in status '${subscriptionData.subscription_status}' — no action needed`,
      };
    }

    // cancelSubscription() uses cancel_at_period_end: true (see services/stripe/subscriptions.js)
    const updatedSub = await cancelSubscription(subscriptionData.stripe_subscription_id);

    return {
      success: true,
      subscription_id: subscriptionData.stripe_subscription_id,
      period_end: updatedSub?.current_period_end ?? subscriptionData.current_period_end,
    };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'cancel stripe subscription at period end');
    return { success: false, error: error.message };
  }
}

/**
 * Re-enable a subscription that was set to cancel at period end.
 * Called when a user cancels their deletion request during the grace period.
 *
 * @param {string} userId
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function reactivateStripeSubscription(userId) {
  try {
    const subscriptionData = await getStoredSubscriptionData(userId);

    if (!subscriptionData?.stripe_subscription_id) {
      return { success: true, message: 'No subscription to reactivate' };
    }

    if (!stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    // Remove cancel_at_period_end so the subscription renews normally.
    await stripe.subscriptions.update(subscriptionData.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    return { success: true, subscription_id: subscriptionData.stripe_subscription_id };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'reactivate stripe subscription');
    return { success: false, error: error.message };
  }
}

// ─── Shared Orchestration ─────────────────────────────────────────────────────

/**
 * Core deletion orchestration shared by both DELETE routes.
 *
 * Sequence:
 *   1. Resolve subscription period end from Stripe (falls back to 30-day minimum)
 *   2. Mark the account as pending_deletion in the DB with correct grace period dates
 *   3. Cancel Stripe subscription at period end (non-fatal if Stripe is unavailable)
 *
 * The caller is responsible for verification (code check or admin auth), audit
 * logging, and response formatting.
 *
 * @param {string} userId
 * @returns {Promise<{
 *   deletionRecord: object,
 *   graceEndDate: Date,
 *   stripeCancellation: object,
 *   subscriptionPeriodEnd: string|null
 * }>}
 */
export async function processDeletionRequest(userId) {
  const subscriptionPeriodEnd = await getSubscriptionPeriodEnd(userId);

  // Mark account as pending_deletion with the correct grace period.
  // markAccountForDeletion enforces a minimum of 30 days even when subscriptionPeriodEnd is null.
  const result = await markAccountForDeletion(userId, subscriptionPeriodEnd);
  const deletionRecord = result.rows[0];
  const graceEndDate = new Date(deletionRecord.anonymization_date);

  // Cancel Stripe subscription so no future charges are made.
  // Done AFTER marking the DB so the cleanup Lambda still runs if Stripe fails.
  const stripeCancellation = await cancelStripeSubscriptionAtPeriodEnd(userId);
  if (!stripeCancellation.success) {
    // Non-fatal: the account is already pending_deletion in the DB.
    logErrorFromCatch(
      new Error(stripeCancellation.error || 'Stripe cancellation failed'),
      'user-data-deletion',
      'cancelStripeSubscriptionAtPeriodEnd'
    );
  }

  return { deletionRecord, graceEndDate, stripeCancellation, subscriptionPeriodEnd };
}

// ─── External Service Deletion ────────────────────────────────────────────────

export async function deleteFromFirebase(userId) {
  try {
    const auth = getAuth();
    await auth.deleteUser(userId);
    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'delete from firebase');
    return { success: false, error: error.message };
  }
}

export async function deleteFromStripe(userId) {
  try {
    const result = await fetchStripeCustomerId(userId);
    if (!result.rows[0]?.stripe_customer_id_encrypted) return { success: true };

    const decryptedId = await decryptStripeCustomerId(
      result.rows[0].stripe_customer_id_encrypted
    );

    if (decryptedId && stripe) {
      await stripe.customers.del(decryptedId);
    }
    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'delete from stripe');
    return { success: false, error: error.message };
  }
}

// ─── Database Cleanup ─────────────────────────────────────────────────────────

/**
 * Delete all supporting-table rows for a user (2FA, consents, preferences, etc.).
 *
 * NOTE: messages and user_personal_info are intentionally excluded.
 * See DELETION_TABLES in queries.js for the full list and rationale.
 *
 * Each table is deleted independently — a failure on one table is logged and
 * the loop continues so all other tables are still cleaned up.
 *
 * @param {string} userId
 * @param {string} userIdHash
 */
export async function deleteAllUserData(userId, userIdHash) {
  for (const { table, column } of DELETION_TABLES) {
    try {
      const value = column === 'user_id_hash' ? userIdHash : userId;
      await deleteFromTable(table, column, value);
    } catch (e) {
      logErrorFromCatch(e, 'user-data', `deleteAllUserData: ${table}`);
    }
  }
}

// ─── Full Anonymization (Phase 1) ─────────────────────────────────────────────

/**
 * Perform complete account anonymization (Phase 1 of the two-phase privacy model).
 *
 * Phase 1 (NOW / grace-period end):
 *   • Firebase account deleted       → user can no longer log in
 *   • Stripe customer deleted        → billing data removed
 *   • Supporting tables cleared      → 2FA, sessions, consents, preferences, etc.
 *   • user_personal_info PII NULLed  → all encrypted columns cleared (anonymizeUserPII)
 *   • email_hash preserved           → legal traceability anchor retained
 *
 * Phase 2 (7 years later, handled by account-cleanup Lambda):
 *   • Chat messages deleted after the legal retention period expires.
 *
 * Messages are retained so that, should litigation arise, an admin can hash the
 * plaintiff's email → look up email_hash → find user_id → retrieve messages.
 */
export async function performCompleteAccountDeletion(userId, userIdHash, req) {
  const results = {
    firebase:      { success: false },
    stripe:        { success: false },
    database:      { success: false },
    anonymization: { success: false },
    audit:         { success: false },
  };

  // Step 1: Delete Firebase account (user can no longer log in)
  results.firebase = await deleteFromFirebase(userId);

  // Step 2: Delete Stripe customer (billing data removed)
  results.stripe = await deleteFromStripe(userId);

  // Step 3: Delete all supporting tables (2FA, consents, preferences, etc.)
  try {
    await deleteAllUserData(userId, userIdHash);
    results.database = { success: true };
  } catch (error) {
    results.database = { success: false, error: error.message };
  }

  // Step 4: Anonymize PII in user_personal_info (NULL out all encrypted columns).
  //         Preserves the row with user_id + email_hash for 7-year legal retention.
  try {
    await anonymizeUserPII(userId);
    results.anonymization = { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'anonymize PII');
    results.anonymization = { success: false, error: error.message };
  }

  // Step 5: Audit trail
  try {
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_ANONYMIZED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        ...results,
        note: 'Chat messages retained for 7-year legal hold; PII anonymized immediately.',
      },
    });
    results.audit = { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'log deletion audit');
    results.audit = { success: false, error: error.message };
  }

  return results;
}
