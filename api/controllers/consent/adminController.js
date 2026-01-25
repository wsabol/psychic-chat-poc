/**
 * Admin Controller for Consent Management
 * Handles admin-only operations like flagging users and sending notifications
 */

import { 
  flagUsersForUpdate, 
  markUserNotified 
} from '../../shared/complianceChecker.js';
import { sendInitialPolicyNotifications } from '../../jobs/policyChangeNotificationJob.js';
import { logAudit } from '../../shared/auditLog.js';
import { db } from '../../shared/db.js';
import { validationError, serverError, successResponse } from '../../utils/responses.js';

/**
 * POST /auth/flag-users-for-update
 * Flag users who need to update consent after policy changes (admin only)
 * This should be called after updating .env with new versions
 */
export async function flagUsers(req, res) {
  try {
    const { documentType = 'both' } = req.body;
    
    const result = await flagUsersForUpdate(documentType);
    
    await logAudit(db, {
      userId: req.user?.userId || 'admin',
      action: 'FLAG_USERS_FOR_UPDATE',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: result
    });
    
    return successResponse(res, {
      success: true,
      message: `Flagged ${result.flagged} users for consent update`,
      ...result
    });
  } catch (error) {
    return serverError(res, error.message);
  }
}

/**
 * POST /auth/mark-user-notified/:userId
 * Mark that user has been notified of version change
 */
export async function markNotified(req, res) {
  try {
    const userId = req.validatedUserId || req.params.userId;
    
    if (!userId) {
      return validationError(res, 'userId required');
    }
    
    const result = await markUserNotified(userId);
    return res.json(result);
  } catch (error) {
    return serverError(res, error.message);
  }
}

/**
 * POST /auth/send-policy-notifications
 * Send initial policy change notifications to all affected users (admin only)
 * This triggers the 30-day grace period
 * 
 * WORKFLOW:
 * 1. Admin updates TERMS_VERSION or PRIVACY_VERSION in .env
 * 2. Admin calls /auth/flag-users-for-update to mark users with outdated versions
 * 3. Admin calls this endpoint to send email notifications and start grace period
 * 4. System automatically sends reminder at 21 days
 * 5. System automatically logs out non-compliant users after 30 days
 */
export async function sendNotifications(req, res) {
  try {
    // Trigger the notification job
    const result = await sendInitialPolicyNotifications();
    
    await logAudit(db, {
      userId: req.user?.userId || 'admin',
      action: 'SEND_POLICY_NOTIFICATIONS',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        gracePeriodEnd: result.gracePeriodEnd
      }
    });
    
    return successResponse(res, {
      success: true,
      message: `Policy notifications sent successfully`,
      results: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        gracePeriodEnd: result.gracePeriodEnd,
        errors: result.errors?.slice(0, 10) // Only return first 10 errors
      }
    });
  } catch (error) {
    await logAudit(db, {
      userId: req.user?.userId || 'admin',
      action: 'SEND_POLICY_NOTIFICATIONS_FAILED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'FAILED',
      details: { error: error.message }
    });
    
    return serverError(res, error.message);
  }
}

export default {
  flagUsers,
  markNotified,
  sendNotifications
};
