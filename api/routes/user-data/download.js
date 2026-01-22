/**
 * User Data Download and Export Routes
 * GDPR Article 20 - Data Portability
 * GET /download-data    - Current user's data export
 * GET /export-data/:userId - Full export (JSON/CSV)
 */

import { Router } from 'express';
import { authenticateToken, authorizeUser } from '../../middleware/auth.js';
import { logAudit } from '../../shared/auditLog.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { db } from '../../shared/db.js';
import { validationError, notFoundError, serverError, successResponse } from '../../utils/responses.js';
import {
  fetchPersonalInfo,
  fetchMessages
} from './helpers/queries.js';
import {
  compileExportData,
  convertToCSV,
  generateExportFilename
} from './helpers/dataExporter.js';

const router = Router();

/**
 * GET /user/download-data
 * Export current user's data as JSON (GDPR Article 20)
 * Uses authenticated user (no URL param needed)
 */
router.get('/download-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.userId;
    const userIdHash = hashUserId(userId);

    // Fetch personal info
    const personalInfo = await fetchPersonalInfo(userId);
    if (personalInfo.rows.length === 0) {
      return notFoundError(res, 'User not found');
    }

    // Fetch only messages (lightweight download)
    const messages = await fetchMessages(userIdHash);

    const data = {
      export_timestamp: new Date().toISOString(),
      personal_information: personalInfo.rows[0],
      chat_messages_count: messages.rows.length,
      chat_messages: messages.rows
    };

    // Log this action
    await logAudit(db, {
      userId,
      action: 'DATA_DOWNLOAD_REQUESTED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
                  status: 'SUCCESS'
    }).catch(e => {
      logErrorFromCatch(e, 'user-data-download', 'Log download request').catch(() => {});
    });

    successResponse(res, data);
  } catch (error) {
    logErrorFromCatch(error, 'app', 'download data');
    return serverError(res, 'Failed to download data');
  }
});

/**
 * GET /user/export-data/:userId?format=json|csv
 * Export all user data in chosen format
 * Requires authorization (must be own user or admin)
 * Supports: JSON (full structure), CSV (spreadsheet-friendly)
 */
router.get('/export-data/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'json' } = req.query;

    if (!['json', 'csv'].includes(format)) {
      return validationError(res, 'Format must be json or csv');
    }

    const userIdHash = hashUserId(userId);

    // Fetch all user data
    const personalInfo = await fetchPersonalInfo(userId);
    if (personalInfo.rows.length === 0) {
      return notFoundError(res, 'User not found');
    }

    // Compile complete export data
    const exportData = await compileExportData(userId, userIdHash);
    exportData.export_format = format;

    // Log export request
    await logAudit(db, {
      userId,
      action: 'DATA_EXPORT_REQUESTED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
                  details: {
        format,
        records_exported: exportData.chat_messages.length + exportData.astrology_readings.length
      }
    }).catch(e => {
      logErrorFromCatch(e, 'user-data-download', 'Log export request').catch(() => {});
    });

    // Return in requested format
    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      const filename = generateExportFilename(userId, 'csv');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    } else {
      // JSON format
      const filename = generateExportFilename(userId, 'json');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return successResponse(res, exportData);
    }
  } catch (error) {
    logErrorFromCatch(error, 'app', 'export');
    await logAudit(db, {
      userId: req.params.userId,
      action: 'DATA_EXPORT_FAILED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'FAILED',
                  details: { error: error.message }
    }).catch(e => {
      logErrorFromCatch(e, 'user-data-download', 'Log export failed').catch(() => {});
    });

    return serverError(res, 'Failed to export data');
  }
});

export default router;
