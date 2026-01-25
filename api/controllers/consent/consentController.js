/**
 * Consent Controller
 * Handles HTTP requests for public consent operations
 */

import * as consentService from '../../services/consent/consentService.js';
import { extractRequestMetadata } from '../../middleware/consent/requestMetadata.js';
import { logAudit } from '../../shared/auditLog.js';
import { db } from '../../shared/db.js';
import { validationError, serverError, successResponse } from '../../utils/responses.js';

/**
 * POST /auth/check-consent/:userId
 * Check if user has accepted T&C and privacy
 */
export async function checkConsent(req, res) {
  try {
    const userId = req.validatedUserId || req.params.userId;
    const consentStatus = await consentService.checkUserConsent(userId);
    return res.json(consentStatus);
  } catch (error) {
    return serverError(res, error.message);
  }
}

/**
 * POST /auth/record-consent/:userId
 * Record user consent
 * NOTE: Public endpoint - can be called during signup before authentication
 */
export async function recordConsent(req, res) {
  try {
    const userId = req.validatedUserId || req.params.userId;
    const { terms_accepted = false, privacy_accepted = false } = req.body;
    
    const metadata = extractRequestMetadata(req);
    const result = await consentService.recordTermsAndPrivacyConsent(
      userId,
      terms_accepted,
      privacy_accepted,
      metadata
    );
    
    if (result.success) {
      return successResponse(res, { 
        success: true, 
        message: result.message 
      });
    } else {
      return validationError(res, result.message);
    }
  } catch (error) {
    return serverError(res, error.message);
  }
}

/**
 * POST /auth/consent/terms-acceptance
 * Record or update user T&C acceptance during registration
 * Called by client during signup flow
 * NOTE: Public endpoint - can be called during signup before authentication
 */
export async function recordTermsAcceptance(req, res) {
  try {
    const userId = req.validatedUserId || req.body.userId;
    const { terms_accepted = false, privacy_accepted = false } = req.body;
    
    const metadata = extractRequestMetadata(req);
    const result = await consentService.recordTermsAndPrivacyConsent(
      userId,
      terms_accepted,
      privacy_accepted,
      metadata
    );
    
    // Log audit event
    await logAudit(db, {
      userId,
      action: 'CONSENT_T&C_RECORDED',
      resourceType: 'compliance',
      ipAddress: metadata.clientIp,
      userAgent: metadata.userAgent,
      httpMethod: req.method,
      endpoint: req.path,
      status: result.success ? 'SUCCESS' : 'FAILED',
      details: {
        terms_accepted,
        privacy_accepted,
        agreed_from_ip: metadata.clientIp
      }
    });
    
    if (result.success) {
      return successResponse(res, {
        success: true,
        message: 'T&C acceptance recorded successfully',
        userId,
        consents: {
          terms_accepted: result.consent.terms_accepted,
          privacy_accepted: result.consent.privacy_accepted,
          terms_accepted_at: result.consent.terms_accepted_at,
          privacy_accepted_at: result.consent.privacy_accepted_at,
          agreed_from_ip: '[ENCRYPTED]'
        }
      });
    } else {
      return serverError(res, 'Failed to record T&C acceptance');
    }
  } catch (error) {
    await logAudit(db, {
      userId: req.body?.userId,
      action: 'CONSENT_T&C_FAILED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'FAILED',
      details: { error: error.message }
    });
    
    return serverError(res, 'Failed to record T&C acceptance');
  }
}

/**
 * POST /auth/consents
 * Record or update user consent for data processing
 * NOTE: Public endpoint - can be called during signup before authentication
 */
export async function recordDataConsents(req, res) {
  try {
    const userId = req.validatedUserId || req.body.userId || req.params.userId;
    const { 
      consent_astrology = false, 
      consent_health_data = false, 
      consent_chat_analysis = false 
    } = req.body;
    
    const metadata = extractRequestMetadata(req);
    const result = await consentService.recordDataProcessingConsents(
      userId,
      { consent_astrology, consent_health_data, consent_chat_analysis },
      metadata
    );
    
    // Log audit event
    await logAudit(db, {
      userId,
      action: 'CONSENT_RECORDED',
      resourceType: 'compliance',
      ipAddress: metadata.clientIp,
      userAgent: metadata.userAgent,
      httpMethod: req.method,
      endpoint: req.path,
      status: result.success ? 'SUCCESS' : 'FAILED',
      details: {
        consent_astrology,
        consent_health_data,
        consent_chat_analysis,
        agreed_from_ip: metadata.clientIp
      }
    });
    
    if (result.success) {
      return successResponse(res, {
        success: true,
        message: 'Consents recorded successfully',
        userId,
        consents: {
          consent_astrology: result.consent.consent_astrology,
          consent_health_data: result.consent.consent_health_data,
          consent_chat_analysis: result.consent.consent_chat_analysis,
          agreed_at: result.consent.agreed_at,
          agreed_from_ip: '[ENCRYPTED]'
        }
      });
    } else {
      return serverError(res, 'Failed to record consent');
    }
  } catch (error) {
    await logAudit(db, {
      userId: req.body?.userId,
      action: 'CONSENT_FAILED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'FAILED',
      details: { error: error.message }
    });
    
    return serverError(res, 'Failed to record consent');
  }
}

/**
 * GET /auth/consents/:userId
 * Retrieve user's current consent status
 */
export async function getConsents(req, res) {
  try {
    const userId = req.validatedUserId || req.params.userId;
    const consents = await consentService.getUserConsents(userId);
    
    // Log audit event
    await logAudit(db, {
      userId,
      action: 'CONSENT_RETRIEVED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    });
    
    return successResponse(res, {
      success: true,
      userId,
      consents,
      message: consents.agreed_at ? null : 'No consent record found - user needs to consent'
    });
  } catch (error) {
    return serverError(res, 'Failed to retrieve consent');
  }
}

/**
 * POST /auth/verify-consent/:userId/:consentType
 * Check if user has specific consent before performing action
 */
export async function verifyConsent(req, res) {
  try {
    const userId = req.validatedUserId || req.params.userId;
    const { consentType } = req.params;
    
    const result = await consentService.verifyConsentType(userId, consentType);
    return successResponse(res, { success: true, ...result });
  } catch (error) {
    return serverError(res, 'Failed to verify consent');
  }
}

/**
 * GET /auth/consent-summary/:userId
 * Get summary of user's consent status and audit trail
 */
export async function getConsentSummary(req, res) {
  try {
    const userId = req.validatedUserId || req.params.userId;
    const summary = await consentService.getConsentSummary(userId);
    
    return successResponse(res, { success: true, ...summary });
  } catch (error) {
    return serverError(res, 'Failed to retrieve consent summary');
  }
}

export default {
  checkConsent,
  recordConsent,
  recordTermsAcceptance,
  recordDataConsents,
  getConsents,
  verifyConsent,
  getConsentSummary
};
