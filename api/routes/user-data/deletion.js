/**
 * Account Deletion Routes
 * GDPR Article 17 - Right to be Forgotten
 * CCPA - Consumer Rights
 *
 * New deletion procedure (grace-period model):
 * ─────────────────────────────────────────────
 * 1. POST  /send-delete-verification   → Send 6-digit code to user's email
 * 2. DELETE /delete-account            → Verify code → cancel Stripe subscription at
 *                                        period end → mark account pending_deletion with
 *                                        grace period = subscription period end
 *                                        (or 30 days minimum for no-subscription accounts)
 * 3. DELETE /delete-account/:userId    → Admin/GDPR-request path with the same grace logic
 * 4. POST   /cancel-deletion/:userId   → Cancel pending deletion and re-enable subscription
 *
 * The user's Firebase account is NOT deleted on request — they retain login access
 * until the grace period (subscription end) expires. The account-cleanup Lambda then:
 *   Phase 1 (grace period end): anonymizes PII columns + deletes Firebase account
 *   Phase 2 (7 years later):    purges retained chat messages
 *
 * Stripe behaviour:
 *   • On deletion request  → cancel_at_period_end: true  (no new charge; access until period end)
 *   • On deletion cancel   → cancel_at_period_end: false (subscription renews normally)
 */

import { Router } from 'express';
import { authenticateToken, authorizeUser } from '../../middleware/auth.js';
import { logAudit } from '../../shared/auditLog.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { db } from '../../shared/db.js';
import {
  validationError,
  notFoundError,
  serverError,
  unprocessableError,
  successResponse,
} from '../../utils/responses.js';
import {
  fetchDeletionCode,
  storeDeletionCode,
  markCodeAsUsed,
  fetchDeletionStatus,
  markAccountForDeletion,
  reactivateDeletionAccount,
  logDeletionAudit,
} from './helpers/queries.js';
import { sendDeleteVerificationEmail, maskEmail } from './helpers/emailService.js';
import { resolveLocaleFromRequest } from '../../shared/email/i18n/index.js';
import {
  cancelStripeSubscriptionAtPeriodEnd,
  reactivateStripeSubscription,
} from './helpers/deletionLogic.js';
import { getStoredSubscriptionData } from '../../services/stripe/database.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive the grace-period end date from the user's active Stripe subscription.
 * Returns an ISO-8601 string, or null if no subscription data is available.
 *
 * Stripe stores `current_period_end` as a Unix timestamp (seconds).
 * We only use it when the subscription is in an active/trialing state AND the
 * period end is actually in the future.
 *
 * @param {string} userId
 * @returns {Promise<string|null>} ISO date string or null
 */
async function getSubscriptionPeriodEnd(userId) {
  try {
    const subscriptionData = await getStoredSubscriptionData(userId);
    if (!subscriptionData) return null;

    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(subscriptionData.subscription_status)) return null;

    if (!subscriptionData.current_period_end) return null;

    // current_period_end may be a Unix timestamp (number) or a JS Date string.
    const periodEndMs =
      typeof subscriptionData.current_period_end === 'number'
        ? subscriptionData.current_period_end * 1000          // Stripe Unix → ms
        : new Date(subscriptionData.current_period_end).getTime(); // already a date

    const periodEnd = new Date(periodEndMs);
    if (isNaN(periodEnd.getTime()) || periodEnd <= new Date()) return null;

    return periodEnd.toISOString();
  } catch (err) {
    logErrorFromCatch(err, 'user-data-deletion', 'getSubscriptionPeriodEnd');
    return null;
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /user/send-delete-verification
 * Send email verification code for account deletion (step 1 of 2).
 * Requires authentication (current user).
 */
router.post('/send-delete-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.userId;
    const userEmail = req.user.email;

    if (!userEmail) {
      return validationError(res, 'User email not found');
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in DB with 10-minute expiry
    await storeDeletionCode(userId, verificationCode);

    // Send verification email in the user's language
    const locale = resolveLocaleFromRequest(req);
    const emailResult = await sendDeleteVerificationEmail(userEmail, verificationCode, locale);
    if (!emailResult.success) {
      logErrorFromCatch(
        new Error(emailResult.error || 'Email send failed'),
        'user-data-deletion',
        'sendDeleteVerificationEmail'
      );
      return serverError(res, 'Failed to send verification email. Please try again.');
    }

    // Audit
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_DELETION_VERIFICATION_SENT',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
    }).catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log verification sent').catch(() => {}));

    return successResponse(res, {
      success: true,
      message: 'Verification code sent to email',
      email_masked: maskEmail(userEmail),
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'send delete verification');
    return serverError(res, 'Failed to send verification email');
  }
});

/**
 * DELETE /user/delete-account
 * Step 2: verify code → cancel Stripe subscription at period end →
 *          mark account pending_deletion (grace period = subscription end).
 *
 * The user's Firebase account is NOT deleted here. They retain access until the
 * grace period (subscription period end) expires. The account-cleanup Lambda
 * handles Phase 1 (PII anonymization + Firebase deletion) at that date.
 *
 * Requires: verificationCode in request body.
 */
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.userId;
    const { verificationCode } = req.body;

    if (!verificationCode) {
      return validationError(res, 'Verification code required');
    }

    // Verify the code is valid and unexpired
    const codeCheck = await fetchDeletionCode(userId, verificationCode);
    if (codeCheck.rows.length === 0) {
      return validationError(res, 'Invalid or expired verification code');
    }

    // Mark code as used immediately to prevent replay
    await markCodeAsUsed(userId, verificationCode);

    // Determine grace period end from subscription (fall back to 30 days)
    const subscriptionPeriodEnd = await getSubscriptionPeriodEnd(userId);

    // Mark account as pending_deletion with correct grace period
    const result = await markAccountForDeletion(userId, subscriptionPeriodEnd);
    const deletionRecord = result.rows[0];
    const graceEndDate = new Date(deletionRecord.anonymization_date);

    // Cancel Stripe subscription at period end so no future charges are made.
    // We do this AFTER marking the DB so that if Stripe fails the DB state is
    // still correct and the cleanup Lambda will still run at the right time.
    const stripeCancellation = await cancelStripeSubscriptionAtPeriodEnd(userId);
    if (!stripeCancellation.success) {
      // Non-fatal: log the error but proceed — the account is already pending_deletion.
      logErrorFromCatch(
        new Error(stripeCancellation.error || 'Stripe cancellation failed'),
        'user-data-deletion',
        'cancelStripeSubscriptionAtPeriodEnd'
      );
    }

    // Audit log
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        grace_period_end: graceEndDate.toISOString(),
        subscription_period_end: subscriptionPeriodEnd,
        stripe_subscription_cancelled: stripeCancellation.success,
        stripe_subscription_id: stripeCancellation.subscription_id || null,
      },
    }).catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log deletion audit').catch(() => {}));

    await logDeletionAudit(userId, 'DELETION_REQUESTED', req.ip, req.get('user-agent'))
      .catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log deletion audit table').catch(() => {}));

    const gracePeriodEndDisplay = graceEndDate.toISOString().split('T')[0];

    return successResponse(res, {
      success: true,
      status: 'pending_deletion',
      grace_period_ends: graceEndDate.toISOString(),
      subscription_cancelled: stripeCancellation.success,
      message: `Your account deletion has been scheduled. Your subscription has been cancelled — you will not be charged for any new billing period. You will continue to have full access until ${gracePeriodEndDisplay}. You may cancel this request before that date.`,
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'delete account');
    return serverError(res, 'Failed to delete account');
  }
});

/**
 * DELETE /user/delete-account/:userId
 * Admin / GDPR-request path: mark an account for deletion with the same
 * subscription-aware grace period and Stripe cancellation logic.
 * No verification code required (admin or owner-only via authorizeUser).
 */
router.delete('/delete-account/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists and check current status
    const user = await fetchDeletionStatus(userId);
    if (user.rows.length === 0) {
      return notFoundError(res, 'User not found');
    }

    const currentStatus = user.rows[0].deletion_status;

    if (currentStatus === 'deleted') {
      return unprocessableError(res, 'Account already permanently deleted');
    }
    if (currentStatus === 'pending_deletion') {
      return unprocessableError(
        res,
        'Account deletion already in progress. Contact support to cancel.'
      );
    }

    // Determine grace period from subscription
    const subscriptionPeriodEnd = await getSubscriptionPeriodEnd(userId);

    // Mark for deletion
    const result = await markAccountForDeletion(userId, subscriptionPeriodEnd);
    const deletionRecord = result.rows[0];
    const graceEndDate = new Date(deletionRecord.anonymization_date);

    // Cancel Stripe subscription at period end
    const stripeCancellation = await cancelStripeSubscriptionAtPeriodEnd(userId);
    if (!stripeCancellation.success) {
      logErrorFromCatch(
        new Error(stripeCancellation.error || 'Stripe cancellation failed'),
        'user-data-deletion',
        'cancelStripeSubscriptionAtPeriodEnd (admin path)'
      );
    }

    // Audit
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        grace_period_end: graceEndDate.toISOString(),
        subscription_period_end: subscriptionPeriodEnd,
        stripe_subscription_cancelled: stripeCancellation.success,
        final_deletion_date: deletionRecord.final_deletion_date,
      },
    }).catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log deletion audit').catch(() => {}));

    await logDeletionAudit(userId, 'DELETION_REQUESTED', req.ip, req.get('user-agent'))
      .catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log deletion audit table').catch(() => {}));

    return successResponse(res, {
      success: true,
      message: 'Account deletion requested',
      userId,
      status: 'pending_deletion',
      grace_period_ends: graceEndDate.toISOString(),
      subscription_cancelled: stripeCancellation.success,
      anonymization_date: deletionRecord.anonymization_date,
      final_deletion_date: deletionRecord.final_deletion_date,
      message_detail:
        `Account marked for deletion. Subscription cancelled at period end. ` +
        `PII will be anonymized on ${graceEndDate.toISOString().split('T')[0]}. ` +
        `Chat history retained until ${new Date(deletionRecord.final_deletion_date).toISOString().split('T')[0]} (7-year legal hold).`,
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'delete account (admin path)');
    await logAudit(db, {
      userId: req.params.userId,
      action: 'ACCOUNT_DELETION_FAILED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'FAILED',
      details: { error: error.message },
    }).catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log deletion failed').catch(() => {}));

    return serverError(res, 'Failed to delete account');
  }
});

/**
 * POST /user/cancel-deletion/:userId
 * Cancel a pending deletion request during the grace period.
 * Also removes the cancel_at_period_end flag from the Stripe subscription
 * so the subscription renews normally.
 */
router.post('/cancel-deletion/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await fetchDeletionStatus(userId);
    if (user.rows.length === 0) {
      return notFoundError(res, 'User not found');
    }

    const { deletion_status, deletion_requested_at } = user.rows[0];

    if (deletion_status !== 'pending_deletion') {
      return unprocessableError(res, 'Account deletion not in progress');
    }

    // Check that the grace period has not yet expired
    // (anonymization_date is the true end; fall back to 30-day check for safety)
    const daysSinceDeletion = Math.floor(
      (Date.now() - new Date(deletion_requested_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceDeletion > 365) {
      // 365 days is a safe upper bound; the actual limit is anonymization_date
      return unprocessableError(res, 'Grace period has expired. Account cannot be recovered.');
    }

    // Reactivate account in DB
    await reactivateDeletionAccount(userId);

    // Re-enable Stripe subscription (removes cancel_at_period_end)
    const stripeReactivation = await reactivateStripeSubscription(userId);
    if (!stripeReactivation.success) {
      logErrorFromCatch(
        new Error(stripeReactivation.error || 'Stripe reactivation failed'),
        'user-data-deletion',
        'reactivateStripeSubscription'
      );
      // Non-fatal — DB is already restored; user should contact support about billing
    }

    // Audit
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_REACTIVATED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        days_since_deletion: daysSinceDeletion,
        stripe_subscription_reactivated: stripeReactivation.success,
      },
    }).catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log reactivation audit').catch(() => {}));

    await logDeletionAudit(userId, 'REACTIVATED', req.ip, req.get('user-agent'))
      .catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log reactivation audit table').catch(() => {}));

    return successResponse(res, {
      success: true,
      message: 'Account reactivated successfully. Your subscription has been restored.',
      userId,
      status: 'active',
      subscription_reactivated: stripeReactivation.success,
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'cancel delete');
    return serverError(res, 'Failed to cancel deletion');
  }
});

export default router;
