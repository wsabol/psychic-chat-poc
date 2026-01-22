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
 */

import { Router } from 'express';
import { db } from '../shared/db.js';
import { logAudit } from '../shared/auditLog.js';
import { validationError, serverError } from '../utils/responses.js';
import { successResponse } from '../utils/responses.js';
import { 
  flagUsersForUpdate,
  getComplianceReport,
  getUsersRequiringAction
} from '../shared/complianceChecker.js';

const router = Router();

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
router.post('/admin/compliance/flag-users', async (req, res) => {
  try {
    const { documentType = 'both', reason = 'Policy update' } = req.body;

    // Validate input
    if (!['terms', 'privacy', 'both'].includes(documentType)) {
      return validationError(res, 'Invalid documentType. Must be: terms, privacy, or both');
    }

    // Flag users
    const result = await flagUsersForUpdate(documentType);

    // Log admin action
    await logAudit(db, {
      userId: req.user?.uid || 'admin',
      action: 'ADMIN_COMPLIANCE_FLAGGED_USERS',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        documentType,
        flaggedCount: result.flagged,
        reason
      }
    });

    return res.json({
      success: true,
      message: `Flagged ${result.flagged} users for ${documentType} update`,
      ...result
    });
    } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * GET /admin/compliance/report
 * Get comprehensive compliance report
 */
router.get('/admin/compliance/report', async (req, res) => {
  try {
    const report = await getComplianceReport();

    return res.json({
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
 * - limit: number (default 100)
 * - offset: number (default 0)
 */
router.get('/admin/compliance/users-requiring-action', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await getUsersRequiringAction();

    // Apply pagination
    const paginatedUsers = result.users.slice(offset, offset + parseInt(limit));

    return res.json({
      success: true,
      totalUsers: result.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      returnedCount: paginatedUsers.length,
      users: paginatedUsers
    });
    } catch (error) {
    return serverError(res, error.message);
  }
});

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
router.post('/admin/compliance/send-notifications', async (req, res) => {
  try {
    const { 
      userIds = null,
      documentType = 'both',
      subject = 'Important: Our Terms and Policies Have Been Updated',
      templateId = null
    } = req.body;

        // Placeholder for email integration

    // Log action
    await logAudit(db, {
      userId: req.user?.uid || 'admin',
      action: 'ADMIN_COMPLIANCE_SEND_NOTIFICATIONS',
      resourceType: 'compliance',
      ipAddress: req.ip,
      status: 'QUEUED',
      details: {
        documentType,
        userCount: userIds?.length || 'all',
        subject
      }
    });

    return res.json({
      success: true,
      message: 'Notification queue created (implementation pending)',
      details: {
        userCount: userIds?.length || 'all',
        documentType,
        subject,
        status: 'QUEUED',
        nextSteps: 'Integrate with Sendgrid or email service'
      }
    });
    } catch (error) {
    return serverError(res, error.message);
  }
});

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
router.post('/admin/compliance/version-change', async (req, res) => {
  try {
    const {
      documentType,
      oldVersion,
      newVersion,
      changeType,
      description,
      changeSummary
    } = req.body;

    // Validate
    if (!['terms', 'privacy'].includes(documentType)) {
      return validationError(res, 'Invalid documentType');
    }

    if (!['MAJOR', 'MINOR', 'PATCH'].includes(changeType)) {
      return validationError(res, 'Invalid changeType');
    }

    // Insert into audit log as a record of this change
    await logAudit(db, {
      userId: req.user?.uid || 'admin',
      action: 'COMPLIANCE_VERSION_CHANGE_RECORDED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: {
        documentType,
        oldVersion,
        newVersion,
        changeType,
        description,
        changeSummary
      }
    });

    return res.json({
      success: true,
      message: `Version change recorded: ${documentType} ${oldVersion} -> ${newVersion}`,
      nextSteps: [
        'Update VERSION_CONFIG in api/shared/versionConfig.js',
        'Run "npm run compliance:flag" to flag users',
        'Run "npm run compliance:notify" to send notifications',
        'Monitor adoption with GET /admin/compliance/report'
      ]
    });
    } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * GET /admin/compliance/version-history
 * Get history of all version changes
 */
router.get('/admin/compliance/version-history', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        created_at,
        action,
        details
      FROM audit_log
      WHERE action = 'COMPLIANCE_VERSION_CHANGE_RECORDED'
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return res.json({
      success: true,
      total: result.rows.length,
      history: result.rows.map(row => ({
        timestamp: row.created_at,
        change: row.details
      }))
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
router.post('/admin/compliance/revert-version', async (req, res) => {
  try {
    const { 
      documentType,
      revokedVersion,
      revertToVersion,
      reason
    } = req.body;

    if (!['terms', 'privacy', 'both'].includes(documentType)) {
      return validationError(res, 'Invalid documentType');
    }

    if (!revokedVersion || !revertToVersion || !reason) {
      return validationError(res, 'revokedVersion, revertToVersion, and reason are required');
    }

    // Flag ALL users for re-acceptance
    // CRITICAL: This includes users who already accepted the reverted version
    // because users who only accepted revoked version v3 never consented to v2
    const flagResult = await db.query(`
      UPDATE user_consents
      SET requires_consent_update = true,
          updated_at = NOW()
      WHERE user_id_hash IS NOT NULL
    `);

    const totalFlagged = flagResult.rowCount;

    // Log the reversion action
    await logAudit(db, {
      userId: req.user?.uid || 'admin',
      action: 'COMPLIANCE_VERSION_REVERTED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: {
        documentType,
        revokedVersion,
        revertToVersion,
        reason,
        totalUsersFlagged: totalFlagged,
        timestamp: new Date().toISOString()
      }
    });

    return res.json({
      success: true,
      message: `Reverted ${documentType} from v${revokedVersion} to v${revertToVersion}. Flagged ${totalFlagged} users for re-acceptance.`,
      details: {
        documentType,
        revokedVersion,
        revertToVersion,
        reason,
        totalUsersFlagged,
        nextSteps: [
          `Update versionConfig.js to ${revertToVersion}-reverted`,
          'Update .env with new version',
          'Rebuild Docker containers',
          `Send urgent notification to all ${totalFlagged} users`,
          'Monitor re-acceptance on dashboard'
        ]
      }
    });
    } catch (error) {
    await logAudit(db, {
      userId: req.user?.uid || 'admin',
      action: 'COMPLIANCE_VERSION_REVERT_FAILED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      status: 'FAILED',
      details: { error: error.message }
    });

    return serverError(res, error.message);
  }
});

export default router;
