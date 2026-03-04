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
  reactivateDeletionAccount,
  logDeletionAudit,
} from './helpers/queries.js';
import { sendDeleteVerificationEmail, maskEmail } from './helpers/emailService.js';
import { resolveLocaleFromRequest } from '../../shared/email/i18n/index.js';
import {
  reactivateStripeSubscription,
  processDeletionRequest,
} from './helpers/deletionLogic.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fire-and-forget audit log wrapper.
 * Failures are logged but never allowed to bubble up to the caller, since an
 * audit-log write failure must not block or roll back the primary operation.
 *
 * @param {object} params   - logAudit payload
 * @param {string} context  - human-readable context string for error logging
 */
async function safeLogAudit(params, context) {
  await logAudit(db, params).catch(e =>
    logErrorFromCatch(e, 'user-data-deletion', context).catch(() => {})
  );
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

    if (!userEmail) return validationError(res, 'User email not found');

    // Generate 6-digit code and store with 10-minute expiry
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
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

    await safeLogAudit({
      userId,
      action: 'ACCOUNT_DELETION_VERIFICATION_SENT',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
    }, 'Log verification sent');

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

    if (!verificationCode) return validationError(res, 'Verification code required');

    // Verify the code is valid and unexpired
    const codeCheck = await fetchDeletionCode(userId, verificationCode);
    if (codeCheck.rows.length === 0) {
      return validationError(res, 'Invalid or expired verification code');
    }

    // Mark code as used immediately to prevent replay
    await markCodeAsUsed(userId, verificationCode);

    // Core deletion orchestration: get subscription end → mark DB → cancel Stripe
    const { deletionRecord, graceEndDate, stripeCancellation, subscriptionPeriodEnd } =
      await processDeletionRequest(userId);

    await safeLogAudit({
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
    }, 'Log deletion audit');

    await logDeletionAudit(userId, 'DELETION_REQUESTED', req.ip, req.get('user-agent'))
      .catch(e => logErrorFromCatch(e, 'user-data-deletion', 'Log deletion audit table').catch(() => {}));

    const gracePeriodEndDisplay = graceEndDate.toISOString().split('T')[0];

    return successResponse(res, {
      success: true,
      status: 'pending_deletion',
      grace_period_ends: graceEndDate.toISOString(),
      subscription_cancelled: stripeCancellation.success,
      message:
        `Your account deletion has been scheduled. Your subscription has been cancelled — ` +
        `you will not be charged for any new billing period. You will continue to have full ` +
        `access until ${gracePeriodEndDisplay}. You may cancel this request before that date.`,
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
  const { userId } = req.params;
  try {
    // Verify user exists and check current status
    const user = await fetchDeletionStatus(userId);
    if (user.rows.length === 0) return notFoundError(res, 'User not found');

    const { deletion_status: currentStatus } = user.rows[0];

    if (currentStatus === 'deleted') {
      return unprocessableError(res, 'Account already permanently deleted');
    }
    if (currentStatus === 'pending_deletion') {
      return unprocessableError(
        res,
        'Account deletion already in progress. Contact support to cancel.'
      );
    }

    // Core deletion orchestration: get subscription end → mark DB → cancel Stripe
    const { deletionRecord, graceEndDate, stripeCancellation } =
      await processDeletionRequest(userId);

    await safeLogAudit({
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
        stripe_subscription_cancelled: stripeCancellation.success,
        final_deletion_date: deletionRecord.final_deletion_date,
      },
    }, 'Log deletion audit');

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
    await safeLogAudit({
      userId,
      action: 'ACCOUNT_DELETION_FAILED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'FAILED',
      details: { error: error.message },
    }, 'Log deletion failed');
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
    if (user.rows.length === 0) return notFoundError(res, 'User not found');

    const { deletion_status, deletion_requested_at } = user.rows[0];

    if (deletion_status !== 'pending_deletion') {
      return unprocessableError(res, 'Account deletion not in progress');
    }

    // Check that the grace period has not yet expired
    // (anonymization_date is the true limit; 365 days is a safe upper bound)
    const daysSinceDeletion = Math.floor(
      (Date.now() - new Date(deletion_requested_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceDeletion > 365) {
      return unprocessableError(res, 'Grace period has expired. Account cannot be recovered.');
    }

    // Reactivate account in DB
    await reactivateDeletionAccount(userId);

    // Re-enable Stripe subscription (removes cancel_at_period_end)
    const stripeReactivation = await reactivateStripeSubscription(userId);
    if (!stripeReactivation.success) {
      // Non-fatal — DB is already restored; user should contact support about billing
      logErrorFromCatch(
        new Error(stripeReactivation.error || 'Stripe reactivation failed'),
        'user-data-deletion',
        'reactivateStripeSubscription'
      );
    }

    await safeLogAudit({
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
    }, 'Log reactivation audit');

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
