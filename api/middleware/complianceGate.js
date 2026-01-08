/**
 * Compliance Gate Middleware
 * 
 * Checks if user has accepted latest version of Terms & Privacy Policy
 * Blocks access to features if user needs to re-accept due to MAJOR version changes
 * 
 * Usage:
 * - Apply to protected routes that require compliance
 * - Redirects to re-consent page if necessary
 */

import { checkUserCompliance } from '../shared/complianceChecker.js';
import logger from '../shared/logger.js';

/**
 * Middleware: Compliance gate
 * Ensures user has accepted latest versions before accessing features
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export async function complianceGate(req, res, next) {
  try {
    // Get user ID from request
    const userId = req.user?.uid || req.userId || req.body?.userId;
    
    if (!userId) {
      // User not authenticated - skip check (will be caught by auth middleware)
      return next();
    }
    
    // Check user's compliance status
    const compliance = await checkUserCompliance(userId);
    
    // Attach compliance info to request for later use
    req.compliance = compliance;
    
    // If user has MAJOR version changes, block access and require re-consent
    if (compliance.blocksAccess) {
      return res.status(451).json({
        error: 'COMPLIANCE_UPDATE_REQUIRED',
        message: 'You must review and accept updated terms to continue',
        details: {
          requiresTermsUpdate: compliance.termsVersion.requiresReacceptance,
          requiresPrivacyUpdate: compliance.privacyVersion.requiresReacceptance,
          termsVersion: compliance.termsVersion,
          privacyVersion: compliance.privacyVersion
        },
        // HTTP 451 = "Unavailable For Legal Reasons"
        redirect: '/update-consent'
      });
    }
    
    // User is compliant or only needs to see notification (MINOR changes)
    next();
  } catch (error) {
    logger.error('[COMPLIANCE-GATE] Error checking compliance:', error);
    
    // Don't block access on error - log it and allow passage
    // This prevents legitimate users from being locked out
    console.error('[COMPLIANCE-GATE] Error:', error.message);
    next();
  }
}

/**
 * Middleware: Soft compliance check
 * Notifies about updates but doesn't block access
 * Good for informational notifications
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export async function softComplianceCheck(req, res, next) {
  try {
    const userId = req.user?.uid || req.userId;
    
    if (!userId) {
      return next();
    }
    
    const compliance = await checkUserCompliance(userId);
    
    // Attach info to request
    req.compliance = compliance;
    
    // ALWAYS allow passage for soft check - just inform
    next();
  } catch (error) {
    logger.error('[COMPLIANCE-SOFT] Error:', error);
    // Always continue on error
    next();
  }
}

/**
 * Middleware: Strict compliance check
 * Blocks ALL access if any version is out of date
 * Even MINOR version changes require re-acceptance
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export async function strictComplianceCheck(req, res, next) {
  try {
    const userId = req.user?.uid || req.userId;
    
    if (!userId) {
      return next();
    }
    
    const compliance = await checkUserCompliance(userId);
    
    // Block if NOT compliant (any version mismatch)
    if (!compliance.compliant) {
      return res.status(451).json({
        error: 'COMPLIANCE_UPDATE_REQUIRED',
        message: 'You must review and accept updated terms to continue',
        details: compliance,
        redirect: '/update-consent'
      });
    }
    
    next();
  } catch (error) {
    logger.error('[COMPLIANCE-STRICT] Error:', error);
    next();
  }
}

/**
 * Helper: Get compliance status from request
 * Use in route handlers to access compliance info attached by middleware
 * 
 * @param {Object} req - Express request
 * @returns {Object} Compliance status object
 */
export function getComplianceStatus(req) {
  return req.compliance || null;
}

/**
 * Helper: Check if user needs to update consent
 * @param {Object} req - Express request
 * @returns {boolean} True if user needs to update
 */
export function requiresConsentUpdate(req) {
  return req.compliance?.blocksAccess === true;
}

export default {
  complianceGate,
  softComplianceCheck,
  strictComplianceCheck,
  getComplianceStatus,
  requiresConsentUpdate
};
