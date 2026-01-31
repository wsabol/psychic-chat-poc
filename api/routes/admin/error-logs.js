/**
 * Error Logs Routes - Admin dashboard for error monitoring
 * 
 * Routes:
 * GET /admin/errors/critical - Unresolved critical errors (last 24h)
 * GET /admin/errors/summary - Error summary (last 7 days)
 * PATCH /admin/errors/:id/resolve - Mark error as resolved
 */

import express from 'express';
import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { serverError, successResponse, validationError, notFoundError } from '../../utils/responses.js';

const router = express.Router();

/**
 * GET /admin/errors/critical
 * Fetch unresolved critical errors from last 24 hours
 */
router.get('/errors/critical', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        service,
        error_message,
        user_id_hash,
        created_at,
        context,
        is_resolved
      FROM error_logs
      WHERE severity = 'critical' 
        AND is_resolved = false 
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await db.query(query);
    
    successResponse(res, {
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    await logErrorFromCatch(error, 'admin-error-logs', 'Failed to fetch critical errors');
    serverError(res, 'Failed to fetch critical errors');
  }
});

/**
 * GET /admin/errors/summary
 * Fetch error summary (7-day rollup by service/severity)
 */
router.get('/errors/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        service,
        severity,
        COUNT(*)::INTEGER as error_count,
        DATE(created_at) as error_date,
        COUNT(DISTINCT COALESCE(user_id_hash, 'unknown'))::INTEGER as affected_users
      FROM error_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY service, severity, DATE(created_at)
      ORDER BY error_date DESC, COUNT(*) DESC
    `;

    const result = await db.query(query);
    
    successResponse(res, {
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    await logErrorFromCatch(error, 'admin-error-logs', 'Failed to fetch error summary');
    serverError(res, 'Failed to fetch error summary');
  }
});

/**
 * PATCH /admin/errors/:id/resolve
 * Mark a specific error as resolved
 */
router.patch('/errors/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_resolved } = req.body;

    // Validate and convert id to integer
    const errorId = parseInt(id, 10);
    if (isNaN(errorId) || errorId <= 0) {
      return validationError(res, 'Invalid error id');
    }

    if (typeof is_resolved !== 'boolean') {
      return validationError(res, 'is_resolved must be a boolean');
    }

    const query = `
      UPDATE error_logs
      SET is_resolved = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, service, error_message, is_resolved
    `;

    const result = await db.query(query, [is_resolved, errorId]);

    if (result.rows.length === 0) {
      return notFoundError(res, 'Error log not found');
    }

    successResponse(res, {
      success: true,
      message: `Error ${errorId} marked as ${is_resolved ? 'resolved' : 'unresolved'}`,
      data: result.rows[0]
    });
  } catch (error) {
    await logErrorFromCatch(error, 'admin-error-logs', 'Failed to update error log');
    serverError(res, 'Failed to update error log');
  }
});

/**
 * GET /admin/errors/count/critical
 * Get quick count of unresolved critical errors
 */
router.get('/errors/count/critical', async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*)::INTEGER as count
      FROM error_logs
      WHERE severity = 'critical' 
        AND is_resolved = false 
        AND created_at > NOW() - INTERVAL '24 hours'
    `;

    const result = await db.query(query);
    
    successResponse(res, {
      success: true,
      count: result.rows[0]?.count || 0
    });
  } catch (error) {
    await logErrorFromCatch(error, 'admin-error-logs', 'Failed to fetch critical error count');
    serverError(res, 'Failed to fetch error count');
  }
});

/**
 * GET /admin/errors/by-service/:service
 * Get errors for a specific service
 */
router.get('/errors/by-service/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { limit = 50 } = req.query;

    const query = `
      SELECT 
        id,
        service,
        error_message,
        severity,
        user_id_hash,
        created_at,
        context,
        is_resolved
      FROM error_logs
      WHERE service = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [service, Math.min(parseInt(limit), 200)]);
    
    successResponse(res, {
      success: true,
      service,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    await logErrorFromCatch(error, 'admin-error-logs', `Failed to fetch errors for service ${req.params.service}`);
    serverError(res, 'Failed to fetch errors');
  }
});

export default router;
