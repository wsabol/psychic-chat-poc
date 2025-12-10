/**
 * Cleanup Status Routes
 * Endpoints to manage and monitor account cleanup jobs
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { triggerCleanupJobManually, getSchedulerStatus } from '../jobs/scheduler.js';
import { getCleanupJobStatus } from '../jobs/accountCleanupJob.js';
import { logAudit } from '../shared/auditLog.js';
import { db } from '../shared/db.js';

const router = Router();

/**
 * GET /cleanup/status
 * Get current cleanup job status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getSchedulerStatus();
    
    res.json({
      success: true,
      message: 'Cleanup job status retrieved',
      ...status
    });

  } catch (error) {
    console.error('[CLEANUP-STATUS] Error:', error);
    res.status(500).json({
      error: 'Failed to get cleanup status',
      details: error.message
    });
  }
});

/**
 * POST /cleanup/trigger
 * Manually trigger cleanup job (admin only)
 */
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    // TODO: Verify admin role
    // For now, just log the request
    
    await logAudit(db, {
      userId: req.userId,
      action: 'CLEANUP_JOB_TRIGGERED_MANUAL',
      resourceType: 'admin',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'INITIATED'
    }).catch(e => console.error('[AUDIT]', e.message));

    const result = await triggerCleanupJobManually();

    res.json({
      success: true,
      message: 'Cleanup job triggered',
      result
    });

  } catch (error) {
    console.error('[CLEANUP-TRIGGER] Error:', error);
    res.status(500).json({
      error: 'Failed to trigger cleanup job',
      details: error.message
    });
  }
});

/**
 * GET /cleanup/stats
 * Get detailed cleanup statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getCleanupJobStatus();

    const accountStats = await db.query(
      `SELECT 
        deletion_status,
        COUNT(*) as count,
        MIN(deletion_requested_at) as oldest_deletion,
        MAX(deletion_requested_at) as newest_deletion
      FROM user_personal_info 
      WHERE deletion_status != 'active'
      GROUP BY deletion_status`
    );

    const auditStats = await db.query(
      `SELECT 
        action,
        COUNT(*) as count,
        MAX(action_timestamp) as last_occurrence
      FROM account_deletion_audit
      GROUP BY action
      ORDER BY count DESC`
    );

    res.json({
      success: true,
      summary: stats,
      by_deletion_status: accountStats.rows,
      deletion_events: auditStats.rows
    });

  } catch (error) {
    console.error('[CLEANUP-STATS] Error:', error);
    res.status(500).json({
      error: 'Failed to get cleanup statistics',
      details: error.message
    });
  }
});

/**
 * GET /cleanup/pending-actions
 * Get list of accounts pending actions
 */
router.get('/pending-actions', async (req, res) => {
  try {
    // Accounts ready for anonymization (1 year)
    const readyForAnonymization = await db.query(
      `SELECT 
        user_id,
        deletion_requested_at,
        (CURRENT_DATE - deletion_requested_at::DATE) as days_since_deletion
      FROM user_personal_info 
      WHERE deletion_status = 'pending_deletion'
        AND deletion_requested_at IS NOT NULL
        AND anonymization_date IS NULL
        AND (CURRENT_DATE - deletion_requested_at::DATE) >= 365
      ORDER BY deletion_requested_at ASC`
    );

    // Accounts ready for permanent deletion (2 years)
    const readyForDeletion = await db.query(
      `SELECT 
        user_id,
        deletion_requested_at,
        (CURRENT_DATE - deletion_requested_at::DATE) as days_since_deletion
      FROM user_personal_info 
      WHERE deletion_status = 'anonymized'
        AND deletion_requested_at IS NOT NULL
        AND (CURRENT_DATE - deletion_requested_at::DATE) >= 730
      ORDER BY deletion_requested_at ASC`
    );

    // Accounts within grace period (1-30 days)
    const inGracePeriod = await db.query(
      `SELECT 
        user_id,
        deletion_requested_at,
        (CURRENT_DATE - deletion_requested_at::DATE) as days_since_deletion,
        (30 - (CURRENT_DATE - deletion_requested_at::DATE)) as days_remaining
      FROM user_personal_info 
      WHERE deletion_status = 'pending_deletion'
        AND deletion_requested_at IS NOT NULL
        AND anonymization_date IS NULL
        AND (CURRENT_DATE - deletion_requested_at::DATE) < 30
      ORDER BY deletion_requested_at ASC`
    );

    res.json({
      success: true,
      pending_actions: {
        ready_for_anonymization: {
          count: readyForAnonymization.rows.length,
          accounts: readyForAnonymization.rows
        },
        ready_for_permanent_deletion: {
          count: readyForDeletion.rows.length,
          accounts: readyForDeletion.rows
        },
        in_grace_period: {
          count: inGracePeriod.rows.length,
          accounts: inGracePeriod.rows
        }
      }
    });

  } catch (error) {
    console.error('[CLEANUP-PENDING] Error:', error);
    res.status(500).json({
      error: 'Failed to get pending actions',
      details: error.message
    });
  }
});

export default router;
