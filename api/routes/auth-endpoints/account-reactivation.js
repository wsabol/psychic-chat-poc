import { Router } from 'express';
import logger from '../../shared/logger.js';
import { db } from '../../shared/db.js';
import { logAudit } from '../../shared/auditLog.js';
import { 
  reactivateAccountFromReengagement, 
  unsubscribeFromReengagementEmails 
} from '../../jobs/accountCleanupJob.js';
import { validationError, notFoundError, serverError, successResponse } from '../../utils/responses.js';

const router = Router();

/**
 * POST /api/account/reactivate
 * Reactivate a deleted account from re-engagement email
 * 
 * This endpoint allows users who requested account deletion to reactivate
 * their account from a link in the re-engagement email.
 */
router.post('/reactivate', async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return validationError(res, 'userId and token are required');
    }

    // Verify token format (basic check)
    if (!isValidReactivationToken(token)) {
      return validationError(res, 'Invalid or expired reactivation token');
    }

    // Check if account exists and is in pending_deletion status
    const accountCheck = await db.query(
      `SELECT user_id, deletion_status FROM user_personal_info 
       WHERE user_id = $1`,
      [userId]
    );

    if (accountCheck.rows.length === 0) {
      return notFoundError(res, 'Account not found');
    }

    const account = accountCheck.rows[0];

    if (account.deletion_status !== 'pending_deletion') {
      return validationError(res, 'Account is not eligible for reactivation');
    }

    // Reactivate the account
    const result = await reactivateAccountFromReengagement(userId);

    if (result.success) {
      // Log the reactivation event
      await logAudit(db, {
        userId: userId,
        action: 'ACCOUNT_REACTIVATED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS',
        details: { via_reengagement: true }
      });

      return successResponse(res, {
        success: true,
        message: 'Your account has been successfully reactivated. You can now log in with your credentials.',
        userId: userId
      });
    } else {
      throw new Error(result.message || 'Failed to reactivate account');
    }

  } catch (error) {
    // Log failed attempt
    try {
      await logAudit(db, {
        userId: req.body.userId || 'unknown',
        action: 'ACCOUNT_REACTIVATION_FAILED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'FAILED',
        details: { error: error.message }
      });
    } catch (auditErr) {
      // Audit log failed silently
    }

    return serverError(res, 'Failed to reactivate account');
  }
});

/**
 * POST /api/account/unsubscribe-reengagement
 * Unsubscribe from re-engagement emails
 * 
 * This endpoint allows users to opt-out of future re-engagement emails
 * without needing to reactivate their account
 */
router.post('/unsubscribe-reengagement', async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return validationError(res, 'userId and token are required');
    }

    // Verify token format (basic check)
    if (!isValidReactivationToken(token)) {
      return validationError(res, 'Invalid or expired token');
    }

    // Unsubscribe from re-engagement emails
    const result = await unsubscribeFromReengagementEmails(userId);

    if (result.success) {
      // Log the unsubscribe event
      await logAudit(db, {
        userId: userId,
        action: 'UNSUBSCRIBED_REENGAGEMENT',
        resourceType: 'preferences',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS',
        details: { unsubscribed_from_reengagement_emails: true }
      });

      return successResponse(res, {
        success: true,
        message: 'You have been unsubscribed from re-engagement emails. You will not receive further account reactivation offers.'
      });
    } else {
      throw new Error(result.message || 'Failed to unsubscribe');
    }

  } catch (error) {
    try {
      await logAudit(db, {
        userId: req.body.userId || 'unknown',
        action: 'UNSUBSCRIBE_REENGAGEMENT_FAILED',
        resourceType: 'preferences',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'FAILED',
        details: { error: error.message }
      });
    } catch (auditErr) {
      // Audit log failed silently
    }

    return serverError(res, 'Failed to unsubscribe from re-engagement emails');
  }
});

/**
 * GET /api/account/deletion-status/:userId
 * Get the deletion status of an account
 * Used for debugging and admin purposes
 */
router.get('/deletion-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT 
        user_id,
        deletion_status,
        deletion_requested_at,
        reengagement_email_6m_sent_at,
        reengagement_email_1y_sent_at,
        reengagement_email_unsub,
        final_deletion_date,
        (CURRENT_DATE - deletion_requested_at::DATE) as days_since_deletion
       FROM user_personal_info 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return notFoundError(res, 'Account not found');
    }

    const account = result.rows[0];

    return successResponse(res, {
      success: true,
      account: {
        user_id: account.user_id,
        deletion_status: account.deletion_status,
        deletion_requested_at: account.deletion_requested_at,
        days_since_deletion: account.days_since_deletion,
        reengagement_email_6m_sent_at: account.reengagement_email_6m_sent_at,
        reengagement_email_1y_sent_at: account.reengagement_email_1y_sent_at,
        reengagement_email_unsub: account.reengagement_email_unsub,
        final_deletion_date: account.final_deletion_date,
        note: 'Data is retained for 7 years (2555 days) from deletion request for legal compliance'
      }
    });

  } catch (error) {
    return serverError(res, 'Failed to check deletion status');
  }
});

/**
 * Validate reactivation token format
 * This is a basic validation - in production use JWT verification
 */
function isValidReactivationToken(token) {
  // Basic validation - token should be a non-empty string
  // In production, verify JWT signature or use a secure token system
  return token && typeof token === 'string' && token.length > 10;
}

export default router;
