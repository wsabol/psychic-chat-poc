/**
 * Anonymous Analytics Routes
 * Logs app usage events to database
 * NO user authentication required (truly anonymous)
 * Encryption handled for sensitive fields with fallback
 */

import { Router } from 'express';
import { db } from '../shared/db.js';
import { validationError, serverError, createdResponse, forbiddenError, successResponse } from '../utils/responses.js';
import { logAudit } from '../shared/auditLog.js';

const router = Router();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * POST /analytics/track
 * Log an analytics event (public endpoint - no auth required)
 */
router.post('/track', async (req, res) => {
  try {
    const {
      event_type,
      page_name,
      event_action,
      user_agent,
      age,
      browser_name,
      browser_version,
      os_name,
      os_version,
      device_type,
      session_duration_ms,
      error_message,
      error_stack,
    } = req.body;

        // Validate required fields
    if (!event_type || !page_name) {
      return validationError(res, 'event_type and page_name are required');
    }

    // Get IP address from request
    const ip_address = req.ip || req.connection.remoteAddress || 'unknown';

    // Try to insert with encryption; fall back to plaintext if encryption fails
    try {
      // Insert analytics event with encrypted sensitive fields
      await db.query(
        `INSERT INTO app_analytics (
          event_type,
          page_name,
          event_action,
          ip_address_encrypted,
          user_agent_encrypted,
          browser_name,
          browser_version,
          os_name,
          os_version,
          device_type,
          session_duration_ms,
          error_message_encrypted,
          error_stack_encrypted,
          created_at
        ) VALUES ($1, $2, $3, pgp_sym_encrypt($4::text, $11), pgp_sym_encrypt($5::text, $11), $6, $7, $8, $9, $10, $12, pgp_sym_encrypt($13::text, $11), pgp_sym_encrypt($14::text, $11), NOW())`,
        [
          event_type,
          page_name,
          event_action,
          ip_address,
          user_agent,
          browser_name,
          browser_version,
          os_name,
          os_version,
          device_type,
          ENCRYPTION_KEY,
          session_duration_ms,
          error_message,
          error_stack,
        ]
      );
    } catch (encryptionError) {
      // Fallback: if encryption fails, store without encryption (less secure but resilient)
      await db.query(
        `INSERT INTO app_analytics (
          event_type,
          page_name,
          event_action,
          browser_name,
          browser_version,
          os_name,
          os_version,
          device_type,
          session_duration_ms,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          event_type,
          page_name,
          event_action,
          browser_name,
          browser_version,
          os_name,
          os_version,
          device_type,
          session_duration_ms,
        ]
      );
    }

    return createdResponse(res, { success: true, message: 'Event tracked' });
  } catch (error) {
    return serverError(res, 'Failed to track event');
  }
});

/**
 * GET /analytics/report
 * Get analytics report (ADMIN ONLY)
 * Returns all analytics data grouped by various metrics
 */
router.get('/report', async (req, res) => {
  try {
    // Verify admin email
    const adminEmail = req.user?.email;
    if (adminEmail !== process.env.ADMIN_EMAIL) {
      return forbiddenError(res, 'Unauthorized - admin access required' );
    }

    // Fetch all analytics data (last 90 days)
    const events = await db.query(
      `SELECT 
        event_type,
        page_name,
        event_action,
        browser_name,
        os_name,
        device_type,
        COUNT(*) as event_count,
        DATE(created_at) as date
       FROM app_analytics
       WHERE created_at >= NOW() - INTERVAL '90 days'
       GROUP BY event_type, page_name, event_action, browser_name, os_name, device_type, DATE(created_at)
       ORDER BY date DESC, event_count DESC`
    );

    // Feature usage
    const featureUsage = await db.query(
      `SELECT 
        page_name,
        event_action,
        COUNT(*) as usage_count,
        DATE(created_at) as date
       FROM app_analytics
       WHERE event_type IN ('page_view', 'click')
         AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY page_name, event_action, DATE(created_at)
       ORDER BY usage_count DESC`
    );

    // Daily active users by location (decrypt IPs if available)
    let dailyActive = { rows: [] };
    try {
      dailyActive = await db.query(
        `SELECT 
          DATE(created_at) as date,
          pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
          os_name,
          device_type,
          COUNT(*) as event_count
         FROM app_analytics
         WHERE created_at >= NOW() - INTERVAL '90 days'
           AND ip_address_encrypted IS NOT NULL
         GROUP BY DATE(created_at), ip_address_encrypted, os_name, device_type
         ORDER BY date DESC`,
        [ENCRYPTION_KEY]
      );
    } catch (decryptError) {
    }

    // Error tracking (decrypt error messages if available)
    let errors = { rows: [] };
    try {
      errors = await db.query(
        `SELECT 
          pgp_sym_decrypt(error_message_encrypted, $1)::text as error_message,
          COUNT(*) as error_count,
          page_name,
          browser_name,
          os_name,
          DATE(created_at) as date
         FROM app_analytics
         WHERE event_type = 'error'
           AND error_message_encrypted IS NOT NULL
           AND created_at >= NOW() - INTERVAL '90 days'
         GROUP BY error_message_encrypted, page_name, browser_name, os_name, DATE(created_at)
         ORDER BY error_count DESC`,
        [ENCRYPTION_KEY]
      );
    } catch (decryptError) {
    }

    // Drop-off analysis
    const dropoff = await db.query(
      `SELECT 
        page_name,
        event_type,
        COUNT(*) as event_count,
        AVG(session_duration_ms) as avg_session_duration_ms,
        MIN(session_duration_ms) as min_session_duration_ms,
        MAX(session_duration_ms) as max_session_duration_ms,
        DATE(created_at) as date
       FROM app_analytics
       WHERE created_at >= NOW() - INTERVAL '90 days'
         AND session_duration_ms IS NOT NULL
       GROUP BY page_name, event_type, DATE(created_at)
       ORDER BY event_count DESC`
    );

    const report = {
      generated_at: new Date().toISOString(),
      summary: {
        total_events: events.rows.reduce((sum, row) => sum + parseInt(row.event_count), 0),
        data_period_days: 90,
        unique_dates: [...new Set(events.rows.map(r => r.date))].length,
      },
      all_events: events.rows,
      feature_usage: featureUsage.rows,
      daily_active_by_location: dailyActive.rows,
      error_tracking: errors.rows,
      dropoff_analysis: dropoff.rows,
    };

        res.json(report);
  } catch (error) {
    return serverError(res, 'Failed to generate analytics report');
  }
});

/**
 * DELETE /analytics/data
 * Delete all analytics data (ADMIN ONLY)
 * Useful for testing or data cleanup
 */
router.delete('/data', async (req, res) => {
  try {
    // Verify admin email
    const adminEmail = req.user?.email;
    if (adminEmail !== process.env.ADMIN_EMAIL) {
      return forbiddenError(res, 'Unauthorized - admin access required');
    }

    const result = await db.query('DELETE FROM app_analytics');
    
    // Audit log the deletion
    await logAudit(db, {
      userId: adminEmail,
      action: 'ANALYTICS_DATA_DELETED',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { action: 'delete_all_analytics', timestamp: new Date().toISOString() }
    });
    
    return successResponse(res, {
      success: true,
      message: 'All analytics data deleted'
    });
  } catch (error) {
    return serverError(res, 'Failed to delete analytics data');
  }
});

/**
 * POST /analytics/cleanup
 * Delete analytics data older than 90 days (ADMIN ONLY)
 * Can be called manually or by scheduled job
 */
router.post('/cleanup', async (req, res) => {
  try {
    // Verify admin email
    const adminEmail = req.user?.email;
    if (adminEmail !== process.env.ADMIN_EMAIL) {
      return forbiddenError(res, 'Unauthorized - admin access required');
    }

    const result = await db.query(
      `DELETE FROM app_analytics 
       WHERE created_at < NOW() - INTERVAL '90 days'`
    );

    // Audit log the cleanup
    await logAudit(db, {
      userId: adminEmail,
      action: 'ANALYTICS_DATA_CLEANUP',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { action: 'cleanup_old_analytics', timestamp: new Date().toISOString() }
    });

    return successResponse(res, {
      success: true,
      message: 'Old analytics data deleted'
    });
  } catch (error) {
    return serverError(res, 'Failed to cleanup analytics data');
  }
});

export default router;
