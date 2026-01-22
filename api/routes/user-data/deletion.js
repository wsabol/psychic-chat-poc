/**
 * Account Deletion Routes
 * GDPR Article 17 - Right to be Forgotten
 * CCPA - Consumer Rights
 * 
 * POST   /send-delete-verification  - Send verification code via email
 * DELETE /delete-account            - Permanent deletion with verification code
 * DELETE /delete-account/:userId    - Request deletion with 30-day grace period
 * POST   /cancel-deletion/:userId   - Cancel pending deletion during grace period
 */

import { Router } from 'express';
import { authenticateToken, authorizeUser } from '../../middleware/auth.js';
import { logAudit } from '../../shared/auditLog.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { db } from '../../shared/db.js';
import { validationError, notFoundError, serverError, unprocessableError, successResponse } from '../../utils/responses.js';
import {
  fetchDeletionCode,
  storeDeletionCode,
  markCodeAsUsed,
  fetchDeletionStatus,
  markAccountForDeletion,
  reactivateDeletionAccount,
  logDeletionAudit
} from './helpers/queries.js';
import {
  sendDeleteVerificationEmail,
  maskEmail
} from './helpers/emailService.js';
import { performCompleteAccountDeletion } from './helpers/deletionLogic.js';

const router = Router();

/**
 * POST /user/send-delete-verification
 * Send email verification code for permanent account deletion
 * Requires authentication (current user)
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

    // Store code temporarily (10 minute expiry)
    await storeDeletionCode(userId, verificationCode);

    // Send verification email
    await sendDeleteVerificationEmail(userEmail, verificationCode);

    // Log action
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_DELETION_VERIFICATION_SENT',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
                  status: 'SUCCESS'
    }).catch(e => {
      logErrorFromCatch(e, 'user-data-deletion', 'Log deletion verification sent').catch(() => {});
    });

    successResponse(res, {
      success: true,
      message: 'Verification code sent to email',
      email_masked: maskEmail(userEmail)
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'send delete verification');
    return serverError(res, 'Failed to send verification email');
  }
});

/**
 * DELETE /user/delete-account
 * Permanently delete user account after email verification
 * Requires: verification code (sent to email)
 */
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.userId;
    const { verificationCode } = req.body;
    const userIdHash = hashUserId(userId);

    if (!verificationCode) {
      return validationError(res, 'Verification code required');
    }

    // Verify code
    const codeCheck = await fetchDeletionCode(userId, verificationCode);
    if (codeCheck.rows.length === 0) {
      return validationError(res, 'Invalid or expired verification code');
    }

    // Mark code as used
    await markCodeAsUsed(userId, verificationCode);

    // Perform complete deletion (Firebase + Stripe + Database)
    const results = await performCompleteAccountDeletion(userId, userIdHash, req);

    successResponse(res, {
      success: true,
      message: 'Account permanently deleted',
      timestamp: new Date().toISOString(),
      details: results
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'delete account');
    return serverError(res, 'Failed to delete account');
  }
});

/**
 * DELETE /user/delete-account/:userId
 * Request account deletion with 30-day grace period
 * Can be cancelled within 30 days
 */
router.delete('/delete-account/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists and get current status
    const user = await fetchDeletionStatus(userId);
    if (user.rows.length === 0) {
      return notFoundError(res, 'User not found');
    }

    const currentStatus = user.rows[0].deletion_status;

    // Check if already permanently deleted
    if (currentStatus === 'deleted') {
      return unprocessableError(res, 'Account already permanently deleted');
    }

    // Check if already pending deletion
    if (currentStatus === 'pending_deletion') {
      return unprocessableError(res, 'Account deletion already in progress. Your account is scheduled for deletion. Contact support to cancel.');
    }

    // Mark account for deletion (30-day grace period)
    const result = await markAccountForDeletion(userId);
    const deletionRecord = result.rows[0];

    // Log deletion request
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
        grace_period_end: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        final_deletion_date: deletionRecord.final_deletion_date
      }
    });

        // Log to deletion audit table
    await logDeletionAudit(userId, 'DELETION_REQUESTED', req.ip, req.get('user-agent'))
      .catch(e => {
        logErrorFromCatch(e, 'user-data-deletion', 'Log deletion audit').catch(() => {});
      });

    const graceEndDate = new Date();
    graceEndDate.setDate(graceEndDate.getDate() + 30);

    return successResponse(res, {
      success: true,
      message: 'Account deletion requested',
      userId,
      status: 'pending_deletion',
      grace_period_ends: graceEndDate.toISOString(),
      message_detail: `Your account will be permanently deleted on ${new Date(deletionRecord.final_deletion_date).toISOString().split('T')[0]} unless you log in to cancel the deletion within 30 days.`
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'delete');
    await logAudit(db, {
      userId: req.params.userId,
      action: 'ACCOUNT_DELETION_FAILED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
            status: 'FAILED',
      details: { error: error.message }
    }).catch(e => {
      logErrorFromCatch(e, 'user-data-deletion', 'Log deletion failed').catch(() => {});
    });

    return serverError(res, 'Failed to delete account');
  }
});

/**
 * POST /user/cancel-deletion/:userId
 * Cancel deletion request and reactivate account during grace period
 */
router.post('/cancel-deletion/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await fetchDeletionStatus(userId);
    if (user.rows.length === 0) {
      return notFoundError(res,  'User not found' );
    }

    const { deletion_status, deletion_requested_at } = user.rows[0];

    if (deletion_status !== 'pending_deletion') {
      return unprocessableError(res, 'Account deletion not in progress');
    }

    // Check if grace period has expired
    const daysSinceDeletion = Math.floor(
      (Date.now() - new Date(deletion_requested_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceDeletion > 30) {
      return unprocessableError(res, 'Grace period has expired. Account cannot be recovered.');
    }

    // Reactivate account
    await reactivateDeletionAccount(userId);

    // Log reactivation
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_REACTIVATED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { days_since_deletion: daysSinceDeletion }
    });

        await logDeletionAudit(userId, 'REACTIVATED', req.ip, req.get('user-agent'))
      .catch(e => {
        logErrorFromCatch(e, 'user-data-deletion', 'Log reactivation audit').catch(() => {});
      });

    return successResponse(res, {
      success: true,
      message: 'Account reactivated successfully',
      userId,
      status: 'active'
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'cancel delete');
    return serverError(res, 'Failed to cancel deletion');
  }
});

export default router;
