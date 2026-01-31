/**
 * Legal Data Requests API (Admin Only)
 * 
 * Provides secure API endpoints for retrieving user data for legal purposes
 * - Subpoenas, court orders, legal discovery
 * - Liability investigations
 * - Regulatory compliance requests
 * 
 * SECURITY:
 * - Requires admin authentication
 * - All requests logged to audit_log
 * - Chain of custody maintained
 */

import { Router } from 'express';
import { serverError, successResponse } from '../../utils/responses.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import {
  findUserByEmail,
  getUserMessagesForLegal,
  getUserAuditTrailForLegal,
  getUserProfileForLegal,
  getUserViolationsForLegal,
  generateLegalDataPackage,
  searchUserMessagesForLegal
} from '../../services/legalDataRequestService.js';

const router = Router();

/**
 * POST /admin/legal-data-requests/find-user
 * Find user by email (first step in legal data request)
 * 
 * Body: { email: string }
 */
router.post('/legal-data-requests/find-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found with provided email'
      });
    }

    return successResponse(res, {
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        subscription_status: user.subscription_status,
        is_suspended: user.is_suspended,
        deletion_requested_at: user.deletion_requested_at
      }
    });
  } catch (error) {
    logErrorFromCatch(error, 'legal-api', 'find-user');
    return serverError(res, 'Failed to find user');
  }
});

/**
 * POST /admin/legal-data-requests/messages
 * Get all messages for a specific user
 * 
 * Body: { 
 *   userId: string,
 *   startDate?: string (ISO),
 *   endDate?: string (ISO),
 *   includeSystemMessages?: boolean,
 *   limit?: number
 * }
 */
router.post('/legal-data-requests/messages', async (req, res) => {
  try {
    const { userId, startDate, endDate, includeSystemMessages, limit } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const messages = await getUserMessagesForLegal(userId, {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      includeSystemMessages: includeSystemMessages !== false,
      limit: limit || null
    });

    return successResponse(res, {
      success: true,
      userId,
      messageCount: messages.length,
      messages
    });
  } catch (error) {
    logErrorFromCatch(error, 'legal-api', 'get-messages');
    return serverError(res, 'Failed to retrieve messages');
  }
});

/**
 * POST /admin/legal-data-requests/audit-trail
 * Get complete audit trail for a user
 * 
 * Body: { userId: string, daysBack?: number }
 */
router.post('/legal-data-requests/audit-trail', async (req, res) => {
  try {
    const { userId, daysBack = 365 } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const auditTrail = await getUserAuditTrailForLegal(userId, daysBack);

    return successResponse(res, {
      success: true,
      userId,
      daysBack,
      eventCount: auditTrail.length,
      auditTrail
    });
  } catch (error) {
    logErrorFromCatch(error, 'legal-api', 'get-audit-trail');
    return serverError(res, 'Failed to retrieve audit trail');
  }
});

/**
 * POST /admin/legal-data-requests/profile
 * Get complete user profile
 * 
 * Body: { userId: string }
 */
router.post('/legal-data-requests/profile', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const profile = await getUserProfileForLegal(userId);

    return successResponse(res, {
      success: true,
      userId,
      profile
    });
  } catch (error) {
    logErrorFromCatch(error, 'legal-api', 'get-profile');
    return serverError(res, 'Failed to retrieve profile');
  }
});

/**
 * POST /admin/legal-data-requests/violations
 * Get user violations history
 * 
 * Body: { userId: string }
 */
router.post('/legal-data-requests/violations', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const violations = await getUserViolationsForLegal(userId);

    return successResponse(res, {
      success: true,
      userId,
      violationCount: violations.length,
      violations
    });
  } catch (error) {
    logErrorFromCatch(error, 'legal-api', 'get-violations');
    return serverError(res, 'Failed to retrieve violations');
  }
});

/**
 * POST /admin/legal-data-requests/complete-package
 * Generate complete legal data package for a user
 * This is the primary endpoint for legal requests
 * 
 * Body: { 
 *   emailOrUserId: string,
 *   requestedBy: string,
 *   requestReason: string
 * }
 */
router.post('/legal-data-requests/complete-package', async (req, res) => {
  try {
    const { emailOrUserId, requestedBy, requestReason } = req.body;

    if (!emailOrUserId || !requestedBy || !requestReason) {
      return res.status(400).json({
        success: false,
        error: 'emailOrUserId, requestedBy, and requestReason are required'
      });
    }

    // Get IP address from request
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    const dataPackage = await generateLegalDataPackage(
      emailOrUserId,
      requestedBy,
      requestReason,
      ipAddress
    );

    return successResponse(res, {
      success: true,
      dataPackage
    });
  } catch (error) {
    logErrorFromCatch(error, 'legal-api', 'generate-complete-package');
    return serverError(res, error.message || 'Failed to generate legal data package');
  }
});

/**
 * POST /admin/legal-data-requests/search-messages
 * Search user messages for specific content
 * Useful for finding references to specific topics
 * 
 * Body: { 
 *   userId: string,
 *   searchTerm: string
 * }
 */
router.post('/legal-data-requests/search-messages', async (req, res) => {
  try {
    const { userId, searchTerm } = req.body;

    if (!userId || !searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'userId and searchTerm are required'
      });
    }

    const messages = await searchUserMessagesForLegal(userId, searchTerm);

    return successResponse(res, {
      success: true,
      userId,
      searchTerm,
      matchCount: messages.length,
      messages
    });
  } catch (error) {
    logErrorFromCatch(error, 'legal-api', 'search-messages');
    return serverError(res, 'Failed to search messages');
  }
});

/**
 * GET /admin/legal-data-requests/export/:userId
 * Export user data as downloadable JSON file
 * 
 * Query params:
 * - requestedBy: string (required)
 * - requestReason: string (required)
 */
router.get('/legal-data-requests/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { requestedBy, requestReason } = req.query;

    if (!requestedBy || !requestReason) {
      return res.status(400).json({
        success: false,
        error: 'requestedBy and requestReason query parameters are required'
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    const dataPackage = await generateLegalDataPackage(
      userId,
      requestedBy,
      requestReason,
      ipAddress
    );

    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `legal-request_${userId.substring(0, 8)}_${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.json(dataPackage);
  } catch (error) {
    logErrorFromCatch(error, 'legal-api', 'export-user-data');
    return serverError(res, error.message || 'Failed to export user data');
  }
});

export default router;
