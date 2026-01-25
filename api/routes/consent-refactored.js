/**
 * Consent Routes (REFACTORED)
 * Clean, maintainable routing layer with separation of concerns
 * 
 * This file replaces the monolithic consent.js with a layered architecture:
 * - Routes: Define endpoints and apply middleware
 * - Controllers: Handle HTTP requests/responses
 * - Services: Contain business logic
 * - Repositories: Handle database operations
 */

import { Router } from 'express';
import { authenticateToken, authorizeUser } from '../middleware/auth.js';
import * as consentController from '../controllers/consent/consentController.js';
import * as complianceController from '../controllers/consent/complianceController.js';
import * as adminController from '../controllers/consent/adminController.js';
import {
  validateUserId,
  validateConsentRequest,
  validateConsentType,
  validateDocumentType
} from '../validators/consent/consentValidators.js';

const router = Router();

// ============================================================================
// CORS PREFLIGHT HANDLERS
// ============================================================================

router.options('/record-consent/:userId', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

router.options('/consent/terms-acceptance', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

router.options('/consents', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// ============================================================================
// PUBLIC CONSENT ENDPOINTS
// ============================================================================

/**
 * Check if user has accepted T&C and privacy
 * NOTE: Public endpoint - can be called during signup
 */
router.post('/check-consent/:userId', 
  validateUserId,
  consentController.checkConsent
);

/**
 * Record user consent
 * NOTE: Public endpoint - can be called during signup before authentication
 */
router.post('/record-consent/:userId',
  validateConsentRequest,
  consentController.recordConsent
);

/**
 * Record or update user T&C acceptance during registration
 * Called by client during signup flow
 * NOTE: Public endpoint - can be called during signup before authentication
 */
router.post('/consent/terms-acceptance',
  validateConsentRequest,
  consentController.recordTermsAcceptance
);

/**
 * Record or update user consent for data processing
 * NOTE: Public endpoint - can be called during signup before authentication
 */
router.post('/consents',
  validateConsentRequest,
  consentController.recordDataConsents
);

/**
 * Verify specific consent type before performing action
 */
router.post('/verify-consent/:userId/:consentType',
  validateUserId,
  validateConsentType,
  consentController.verifyConsent
);

// ============================================================================
// AUTHENTICATED USER ENDPOINTS
// ============================================================================

/**
 * Retrieve user's current consent status
 * Requires authentication
 */
router.get('/consents/:userId',
  authenticateToken,
  authorizeUser,
  validateUserId,
  consentController.getConsents
);

/**
 * Get summary of user's consent status and audit trail
 * Requires authentication
 */
router.get('/consent-summary/:userId',
  authenticateToken,
  authorizeUser,
  validateUserId,
  consentController.getConsentSummary
);

// ============================================================================
// COMPLIANCE ENDPOINTS
// ============================================================================

/**
 * Check if user's consent is compliant with current versions
 */
router.post('/check-compliance/:userId',
  validateUserId,
  complianceController.checkCompliance
);

/**
 * Get current version configuration (public)
 */
router.get('/version-config',
  complianceController.getVersionConfig
);

/**
 * Check if policy notifications have been sent for current version
 * Requires authentication
 */
router.get('/check-notifications-sent',
  authenticateToken,
  complianceController.checkNotificationsSent
);

// ============================================================================
// ADMIN-ONLY ENDPOINTS
// ============================================================================

/**
 * Get compliance statistics
 * Admin only
 */
router.post('/compliance-report',
  authenticateToken,
  complianceController.getReport
);

/**
 * Get list of users who need to re-accept terms
 * Admin only
 */
router.post('/users-requiring-action',
  authenticateToken,
  complianceController.getUsersNeedingAction
);

/**
 * Flag users who need to update consent after policy changes
 * Admin only - should be called after updating .env with new versions
 */
router.post('/flag-users-for-update',
  authenticateToken,
  validateDocumentType,
  adminController.flagUsers
);

/**
 * Mark that user has been notified of version change
 * Admin only
 */
router.post('/mark-user-notified/:userId',
  validateUserId,
  adminController.markNotified
);

/**
 * Send initial policy change notifications to all affected users
 * Admin only - triggers the 30-day grace period
 * 
 * WORKFLOW:
 * 1. Admin updates TERMS_VERSION or PRIVACY_VERSION in .env
 * 2. Admin calls /auth/flag-users-for-update to mark users with outdated versions
 * 3. Admin calls this endpoint to send email notifications and start grace period
 * 4. System automatically sends reminder at 21 days
 * 5. System automatically logs out non-compliant users after 30 days
 */
router.post('/send-policy-notifications',
  authenticateToken,
  adminController.sendNotifications
);

export default router;
