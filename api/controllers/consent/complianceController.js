/**
 * Compliance Controller
 * Handles compliance checking and version configuration endpoints
 */

import { 
  checkUserCompliance, 
  getComplianceReport, 
  getUsersRequiringAction 
} from '../../shared/complianceChecker.js';
import { 
  getCurrentTermsVersion, 
  getCurrentPrivacyVersion 
} from '../../shared/versionConfig.js';
import VERSION_CONFIG from '../../shared/versionConfig.js';
import * as consentRepository from '../../repositories/consent/consentRepository.js';
import { validationError, serverError, successResponse } from '../../utils/responses.js';

/**
 * POST /auth/check-compliance/:userId
 * Check if user's consent is compliant with current versions
 */
export async function checkCompliance(req, res) {
  try {
    const userId = req.validatedUserId || req.params.userId;
    
    if (!userId) {
      return validationError(res, 'userId required');
    }
    
    const compliance = await checkUserCompliance(userId);
    return res.json(compliance);
  } catch (error) {
    return serverError(res, error.message);
  }
}

/**
 * POST /auth/compliance-report
 * Get compliance statistics (admin only)
 */
export async function getReport(req, res) {
  try {
    const report = await getComplianceReport();
    return res.json(report);
  } catch (error) {
    return serverError(res, error.message);
  }
}

/**
 * POST /auth/users-requiring-action
 * Get list of users who need to re-accept terms (admin only)
 */
export async function getUsersNeedingAction(req, res) {
  try {
    const result = await getUsersRequiringAction();
    return res.json(result);
  } catch (error) {
    return serverError(res, error.message);
  }
}

/**
 * GET /auth/version-config
 * Get current version configuration (public)
 */
export async function getVersionConfig(req, res) {
  const currentTermsVersion = getCurrentTermsVersion();
  const currentPrivacyVersion = getCurrentPrivacyVersion();
  
  return successResponse(res, {
    success: true,
    versions: {
      terms: {
        version: currentTermsVersion,
        changeType: VERSION_CONFIG.terms.changeType,
        changedAt: VERSION_CONFIG.terms.changedAt,
        description: VERSION_CONFIG.terms.description
      },
      privacy: {
        version: currentPrivacyVersion,
        changeType: VERSION_CONFIG.privacy.changeType,
        changedAt: VERSION_CONFIG.privacy.changedAt,
        description: VERSION_CONFIG.privacy.description
      }
    }
  });
}

/**
 * GET /auth/check-notifications-sent
 * Check if policy notifications have already been sent for current version
 * Returns true if users have been notified recently (within 7 days of version update)
 */
export async function checkNotificationsSent(req, res) {
  try {
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();
    
    const versionChangeDate = VERSION_CONFIG.terms.changedAt || VERSION_CONFIG.privacy.changedAt;
    
    const notificationStatus = await consentRepository.checkNotificationsSent(
      currentTermsVersion,
      currentPrivacyVersion
    );
    
    const alreadySent = notificationStatus.notifiedCount > 0;
    
    return successResponse(res, {
      alreadySent,
      notifiedCount: notificationStatus.notifiedCount,
      lastNotification: notificationStatus.lastNotification,
      currentVersions: {
        terms: currentTermsVersion,
        privacy: currentPrivacyVersion
      },
      versionChangeDate
    });
  } catch (error) {
    return serverError(res, error.message);
  }
}

export default {
  checkCompliance,
  getReport,
  getUsersNeedingAction,
  getVersionConfig,
  checkNotificationsSent
};
