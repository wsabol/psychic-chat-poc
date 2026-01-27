/**
 * Compliance Admin Routes
 * 
 * Administrative endpoints for managing consent version updates
 * Requires admin authentication
 * 
 * Endpoints:
 * - POST /admin/compliance/flag-users - Flag users for re-acceptance
 * - GET /admin/compliance/report - Get compliance adoption report
 * - GET /admin/compliance/users-requiring-action - List users needing updates
 * - POST /admin/compliance/send-notifications - Send notification emails (placeholder)
 * - POST /admin/compliance/version-change - Log a version change
 * - GET /admin/compliance/version-history - Get history of version changes
 * - POST /admin/compliance/revert-version - Revert to earlier version (critical operation)
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { authenticateToken } from '../middleware/auth.js';
import { serverError, successResponse } from '../utils/responses.js';
import { NOTIFICATION_DEFAULTS } from '../constants/compliance.js';
import {
  validateFlagUsersRequest,
  validatePaginationParams,
  validateNotificationsRequest,
  validateVersionChangeRequest,
  validateRevertVersionRequest
} from '../validators/compliance/complianceAdminValidators.js';
import {
  flagUsersForReacceptance,
  getAdoptionReport,
  getUsersRequiringActionPaginated,
  queueNotifications,
  recordVersionChange,
  getVersionHistory,
  revertVersion
} from '../services/compliance/complianceAdminService.js';

const router = Router();

// Apply authentication and admin middleware to ALL routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Helper function to build audit context from request
 * @param {Object} req - Express request
 * @returns {Object} Audit context
 */
function buildAuditContext(req) {
  return {
    userId: req.user?.uid,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    httpMethod: req.method,
    endpoint: req.path
  };
}

/**
 * POST /admin/compliance/flag-users
 * Flag users who need to re-accept due to version change
 * 
 * Body:
 * {
 *   documentType: 'terms' | 'privacy' | 'both',
 *   reason: 'Major policy change' (for audit)
 * }
 */
router.post(
  '/admin/compliance/flag-users',
  validateFlagUsersRequest,
  async (req, res) => {
    try {
      const { documentType = 'both', reason = 'Policy update' } = req.body;

      const result = await flagUsersForReacceptance({
        documentType,
        reason,
        auditContext: buildAuditContext(req)
      });

      return successResponse(res, {
        success: true,
        message: `Flagged ${result.flagged} users for ${documentType} update`,
        ...result
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  }
);

/**
 * GET /admin/compliance/report
 * Get comprehensive compliance report
 */
router.get('/admin/compliance/report', async (req, res) => {
  try {
    const report = await getAdoptionReport();

    return successResponse(res, {
      success: true,
      ...report
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * GET /admin/compliance/users-requiring-action
 * Get list of users who need to re-accept terms
 * 
 * Query params:
 * - limit: number (default 100, max 1000)
 * - offset: number (default 0)
 */
router.get(
  '/admin/compliance/users-requiring-action',
  validatePaginationParams,
  async (req, res) => {
    try {
      const result = await getUsersRequiringActionPaginated(req.pagination);

      return successResponse(res, {
        success: true,
        ...result
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  }
);

/**
 * POST /admin/compliance/send-notifications
 * Send notification emails to users about version changes
 * 
 * NOTE: This is a placeholder for integration with email service
 * (Sendgrid, etc)
 * 
 * Body:
 * {
 *   userIds: ['user1', 'user2'],  // specific users, or null for all
 *   documentType: 'terms' | 'privacy' | 'both',
 *   subject: 'Custom subject line',
 *   templateId: 'sendgrid_template_id'  // optional
 * }
 */
router.post(
  '/admin/compliance/send-notifications',
  validateNotificationsRequest,
  async (req, res) => {
    try {
      const { 
        userIds = null,
        documentType = 'both',
        subject = NOTIFICATION_DEFAULTS.SUBJECT,
        templateId = null
      } = req.body;

      const result = await queueNotifications({
        userIds,
        documentType,
        subject,
        templateId,
        auditContext: buildAuditContext(req)
      });

      return successResponse(res, {
        success: true,
        message: 'Notification queue created (implementation pending)',
        details: result
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  }
);

/**
 * POST /admin/compliance/version-change
 * Record a version change in the system
 * This is for documentation/auditing purposes
 * 
 * Body:
 * {
 *   documentType: 'terms' | 'privacy',
 *   oldVersion: '1.0',
 *   newVersion: '1.1',
 *   changeType: 'MAJOR' | 'MINOR' | 'PATCH',
 *   description: 'Summary of changes',
 *   changeSummary: {
 *     added: ['New section about X'],
 *     modified: ['Section Y updated'],
 *     removed: []
 *   }
 * }
 */
router.post(
  '/admin/compliance/version-change',
  validateVersionChangeRequest,
  async (req, res) => {
    try {
      const {
        documentType,
        oldVersion,
        newVersion,
        changeType,
        description,
        changeSummary
      } = req.body;

      const result = await recordVersionChange({
        documentType,
        oldVersion,
        newVersion,
        changeType,
        description,
        changeSummary,
        auditContext: buildAuditContext(req)
      });

      return successResponse(res, {
        success: true,
        message: `Version change recorded: ${documentType} ${oldVersion} -> ${newVersion}`,
        ...result
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  }
);

/**
 * GET /admin/compliance/version-history
 * Get history of all version changes
 */
router.get('/admin/compliance/version-history', async (req, res) => {
  try {
    const result = await getVersionHistory();

    return successResponse(res, {
      success: true,
      ...result
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /admin/compliance/revert-version
 * Revert to an earlier version and flag ALL users to re-accept
 * Used when a version is found to have legal issues
 * 
 * CRITICAL: Flags ALL users (even those who accepted original version)
 * because users who only accepted reverted version never consented to new version
 * 
 * Body:
 * {
 *   documentType: 'terms' | 'privacy' | 'both',
 *   revokedVersion: '3.0',  // Version being reverted FROM
 *   revertToVersion: '2.0',  // Version being reverted TO
 *   reason: 'Legal concerns with indemnification clause'
 * }
 */
router.post(
  '/admin/compliance/revert-version',
  validateRevertVersionRequest,
  async (req, res) => {
    try {
      const { 
        documentType,
        revokedVersion,
        revertToVersion,
        reason
      } = req.body;

      const result = await revertVersion({
        documentType,
        revokedVersion,
        revertToVersion,
        reason,
        auditContext: buildAuditContext(req)
      });

      return successResponse(res, {
        success: true,
        message: `Reverted ${documentType} from v${revokedVersion} to v${revertToVersion}. Flagged ${result.totalUsersFlagged} users for re-acceptance.`,
        details: result
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  }
);

export default router;
