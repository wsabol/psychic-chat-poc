/**
 * Violation Reporting API
 * Provides analytics and monitoring endpoints for admin dashboard
 * 
 * Endpoints:
 * - GET /violations/report - Full violation report
 * - GET /violations/stats - Quick statistics
 * - GET /violations/patterns - Detected patterns
 * - GET /violations/false-positives - False positive analysis
 * - POST /violations/false-positive - Mark violation as false positive
 */

import express from 'express';
import { validationError, notFoundError, serverError, successResponse } from '../utils/responses.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import * as violationReportService from '../services/violationReportService.js';

const router = express.Router();

/**
 * GET /api/violations/report
 * Complete violation monitoring report
 */
router.get('/report', async (req, res) => {
  try {
    const report = await violationReportService.getCompleteReport();
    successResponse(res, report);
  } catch (err) {
    logErrorFromCatch('Error generating violations report:', err);
    return serverError(res, 'Failed to generate violations report');
  }
});

/**
 * GET /api/violations/stats
 * Quick statistics snapshot
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await violationReportService.generateSummary();
    successResponse(res, stats);
  } catch (err) {
    logErrorFromCatch('Error getting violations stats:', err);
    return serverError(res, 'Failed to get violations stats');
  }
});

/**
 * GET /api/violations/patterns
 * Violation patterns detected
 */
router.get('/patterns', async (req, res) => {
  try {
    const patterns = await violationReportService.getPatternAnalysis();
    successResponse(res, patterns);
  } catch (err) {
    logErrorFromCatch('Error getting violation patterns:', err);
    return serverError(res, 'Failed to get violation patterns');
  }
});

/**
 * GET /api/violations/false-positives
 * False positive analysis
 */
router.get('/false-positives', async (req, res) => {
  try {
    const analysis = await violationReportService.getFalsePositiveAnalysis();
    successResponse(res, analysis);
  } catch (err) {
    logErrorFromCatch('Error getting false positive analysis:', err);
    return serverError(res, 'Failed to get false positive analysis');
  }
});

/**
 * POST /api/violations/false-positive
 * Mark a violation as false positive
 * Body: { violationId, reason, context }
 */
router.post('/false-positive', async (req, res) => {
  try {
    const { violationId, reason, context } = req.body;

    if (!violationId || !reason) {
      return validationError(res, 'violationId and reason required');
    }

    const result = await violationReportService.markAsFalsePositive(violationId, reason, context);

    if (!result.success) {
      if (result.error === 'Violation not found') {
        return notFoundError(res, result.error);
      }
      return serverError(res, result.error);
    }

    successResponse(res, { success: true, message: result.message });
  } catch (err) {
    logErrorFromCatch('Error marking false positive:', err);
    return serverError(res, 'Failed to mark false positive');
  }
});

export default router;
