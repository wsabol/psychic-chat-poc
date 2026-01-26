/**
 * Security Metrics API
 * Intrusion Detection Dashboard
 */

import { Router } from 'express';
import { getSecurityMetrics, getIPSecurityScore } from '../../services/security/intrusionDetection/index.js';
import { serverError, successResponse } from '../../utils/responses.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

const router = Router();

/**
 * GET /admin/security-metrics/overview
 * Get security dashboard metrics
 */
router.get('/security-metrics/overview', async (req, res) => {
  try {
    const metrics = await getSecurityMetrics();
    
    if (!metrics) {
      return serverError(res, 'Failed to retrieve security metrics');
    }

    return successResponse(res, {
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    logErrorFromCatch(error, 'admin', 'security-metrics');
    return serverError(res, 'Failed to get security metrics');
  }
});

/**
 * GET /admin/security-metrics/ip-score/:ipAddress
 * Get security score for specific IP address
 */
router.get('/security-metrics/ip-score/:ipAddress', async (req, res) => {
  try {
    const { ipAddress } = req.params;
    
    if (!ipAddress) {
      return res.status(400).json({ success: false, error: 'IP address required' });
    }

    const score = await getIPSecurityScore(ipAddress);

    return successResponse(res, {
      success: true,
      ipAddress,
      score,
      severity: score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logErrorFromCatch(error, 'admin', 'security-metrics');
    return serverError(res, 'Failed to get IP security score');
  }
});

export default router;
