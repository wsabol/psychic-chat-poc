/**
 * Compliance Admin Service
 * 
 * Business logic for compliance administration operations
 * Handles version management, user flagging, and reporting
 */

import { db } from '../../shared/db.js';
import { logAudit } from '../../shared/auditLog.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { AUDIT_ACTIONS } from '../../constants/compliance.js';
import { 
  flagUsersForUpdate,
  getComplianceReport,
  getUsersRequiringAction
} from '../../shared/complianceChecker.js';

/**
 * Flag users for re-acceptance due to version change
 * 
 * @param {Object} params - Parameters
 * @param {string} params.documentType - 'terms' | 'privacy' | 'both'
 * @param {string} params.reason - Reason for flagging
 * @param {Object} params.auditContext - Context for audit logging (userId, ip, userAgent, etc.)
 * @returns {Promise<Object>} Result with flagged count
 */
export async function flagUsersForReacceptance(params) {
  const { documentType, reason, auditContext } = params;

  try {
    // Flag users using existing utility
    const result = await flagUsersForUpdate(documentType);

    // Log admin action
    await logAudit(db, {
      userId: auditContext.userId || 'admin',
      action: AUDIT_ACTIONS.FLAGGED_USERS,
      resourceType: 'compliance',
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      httpMethod: auditContext.httpMethod,
      endpoint: auditContext.endpoint,
      status: 'SUCCESS',
      details: {
        documentType,
        flaggedCount: result.flagged,
        reason
      }
    });

    return {
      success: true,
      flagged: result.flagged,
      documentType,
      reason,
      timestamp: result.timestamp
    };
  } catch (error) {
    logErrorFromCatch(error, 'compliance-admin', 'flagUsersForReacceptance');
    throw error;
  }
}

/**
 * Get compliance adoption report
 * 
 * @returns {Promise<Object>} Compliance report
 */
export async function getAdoptionReport() {
  try {
    return await getComplianceReport();
  } catch (error) {
    logErrorFromCatch(error, 'compliance-admin', 'getAdoptionReport');
    throw error;
  }
}

/**
 * Get paginated list of users requiring action
 * 
 * @param {Object} pagination - Pagination params
 * @param {number} pagination.limit - Max results
 * @param {number} pagination.offset - Offset for pagination
 * @returns {Promise<Object>} Paginated user list
 */
export async function getUsersRequiringActionPaginated(pagination) {
  try {
    const { limit, offset } = pagination;
    
    // Get all users requiring action
    const result = await getUsersRequiringAction();

    // Apply pagination in service layer
    const paginatedUsers = result.users.slice(offset, offset + limit);

    return {
      totalUsers: result.count,
      limit,
      offset,
      returnedCount: paginatedUsers.length,
      users: paginatedUsers
    };
  } catch (error) {
    logErrorFromCatch(error, 'compliance-admin', 'getUsersRequiringActionPaginated');
    throw error;
  }
}

/**
 * Queue notification emails to users (placeholder implementation)
 * 
 * @param {Object} params - Parameters
 * @param {Array<string>|null} params.userIds - Specific user IDs or null for all
 * @param {string} params.documentType - 'terms' | 'privacy' | 'both'
 * @param {string} params.subject - Email subject
 * @param {string|null} params.templateId - Email template ID
 * @param {Object} params.auditContext - Context for audit logging
 * @returns {Promise<Object>} Queue result
 */
export async function queueNotifications(params) {
  const { userIds, documentType, subject, templateId, auditContext } = params;

  try {
    // TODO: Integrate with actual email service (SendGrid, etc.)
    // For now, this is a placeholder that logs the action

    // Log action
    await logAudit(db, {
      userId: auditContext.userId || 'admin',
      action: AUDIT_ACTIONS.SEND_NOTIFICATIONS,
      resourceType: 'compliance',
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      httpMethod: auditContext.httpMethod,
      endpoint: auditContext.endpoint,
      status: 'QUEUED',
      details: {
        documentType,
        userCount: userIds?.length || 'all',
        subject,
        templateId
      }
    });

    return {
      success: true,
      status: 'QUEUED',
      userCount: userIds?.length || 'all',
      documentType,
      subject,
      nextSteps: 'Integrate with Sendgrid or email service'
    };
  } catch (error) {
    logErrorFromCatch(error, 'compliance-admin', 'queueNotifications');
    throw error;
  }
}

/**
 * Record a version change in the audit log
 * 
 * @param {Object} params - Parameters
 * @param {string} params.documentType - 'terms' | 'privacy'
 * @param {string} params.oldVersion - Previous version
 * @param {string} params.newVersion - New version
 * @param {string} params.changeType - 'MAJOR' | 'MINOR' | 'PATCH'
 * @param {string} params.description - Description of changes
 * @param {Object} params.changeSummary - Summary of changes (added, modified, removed)
 * @param {Object} params.auditContext - Context for audit logging
 * @returns {Promise<Object>} Result
 */
export async function recordVersionChange(params) {
  const {
    documentType,
    oldVersion,
    newVersion,
    changeType,
    description,
    changeSummary,
    auditContext
  } = params;

  try {
    // Insert into audit log
    await logAudit(db, {
      userId: auditContext.userId || 'admin',
      action: AUDIT_ACTIONS.VERSION_CHANGE_RECORDED,
      resourceType: 'compliance',
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      httpMethod: auditContext.httpMethod,
      endpoint: auditContext.endpoint,
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

    return {
      success: true,
      documentType,
      oldVersion,
      newVersion,
      changeType,
      nextSteps: [
        'Update VERSION_CONFIG in api/shared/versionConfig.js',
        'Run "npm run compliance:flag" to flag users',
        'Run "npm run compliance:notify" to send notifications',
        'Monitor adoption with GET /admin/compliance/report'
      ]
    };
  } catch (error) {
    logErrorFromCatch(error, 'compliance-admin', 'recordVersionChange');
    throw error;
  }
}

/**
 * Get version change history from audit log
 * 
 * @returns {Promise<Object>} Version history
 */
export async function getVersionHistory() {
  try {
    const result = await db.query(`
      SELECT 
        created_at,
        action,
        details
      FROM audit_log
      WHERE action = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [AUDIT_ACTIONS.VERSION_CHANGE_RECORDED]);

    return {
      total: result.rows.length,
      history: result.rows.map(row => ({
        timestamp: row.created_at,
        change: row.details
      }))
    };
  } catch (error) {
    logErrorFromCatch(error, 'compliance-admin', 'getVersionHistory');
    throw error;
  }
}

/**
 * Revert to an earlier version (with transaction support)
 * CRITICAL: This flags ALL users for re-acceptance
 * 
 * @param {Object} params - Parameters
 * @param {string} params.documentType - 'terms' | 'privacy' | 'both'
 * @param {string} params.revokedVersion - Version being reverted FROM
 * @param {string} params.revertToVersion - Version being reverted TO
 * @param {string} params.reason - Reason for reversion
 * @param {Object} params.auditContext - Context for audit logging
 * @returns {Promise<Object>} Result with flagged count
 */
export async function revertVersion(params) {
  const {
    documentType,
    revokedVersion,
    revertToVersion,
    reason,
    auditContext
  } = params;

  // Use database transaction for atomicity
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Flag ALL users for re-acceptance
    // CRITICAL: This includes users who already accepted the reverted version
    const flagResult = await client.query(`
      UPDATE user_consents
      SET requires_consent_update = true,
          updated_at = NOW()
      WHERE user_id_hash IS NOT NULL
    `);

    const totalFlagged = flagResult.rowCount;

    // Log the reversion action
    await logAudit(db, {
      userId: auditContext.userId || 'admin',
      action: AUDIT_ACTIONS.VERSION_REVERTED,
      resourceType: 'compliance',
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      httpMethod: auditContext.httpMethod,
      endpoint: auditContext.endpoint,
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

    // Commit transaction
    await client.query('COMMIT');

    return {
      success: true,
      documentType,
      revokedVersion,
      revertToVersion,
      reason,
      totalUsersFlagged: totalFlagged,
      nextSteps: [
        `Update versionConfig.js to ${revertToVersion}-reverted`,
        'Update .env with new version',
        'Rebuild Docker containers',
        `Send urgent notification to all ${totalFlagged} users`,
        'Monitor re-acceptance on dashboard'
      ]
    };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');

    // Log failure
    await logAudit(db, {
      userId: auditContext.userId || 'admin',
      action: AUDIT_ACTIONS.VERSION_REVERT_FAILED,
      resourceType: 'compliance',
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      httpMethod: auditContext.httpMethod,
      endpoint: auditContext.endpoint,
      status: 'FAILED',
      details: { 
        error: error.message,
        documentType,
        revokedVersion,
        revertToVersion
      }
    });

    logErrorFromCatch(error, 'compliance-admin', 'revertVersion');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  flagUsersForReacceptance,
  getAdoptionReport,
  getUsersRequiringActionPaginated,
  queueNotifications,
  recordVersionChange,
  getVersionHistory,
  revertVersion
};
