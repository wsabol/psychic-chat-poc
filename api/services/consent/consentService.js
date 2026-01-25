/**
 * Consent Service
 * Business logic for consent management
 */

import { hashUserId } from '../../shared/hashUtils.js';
import { 
  getCurrentTermsVersion, 
  getCurrentPrivacyVersion 
} from '../../shared/versionConfig.js';
import * as consentRepository from '../../repositories/consent/consentRepository.js';
import * as encryptionService from './encryptionService.js';

/**
 * Check user consent status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Consent status
 */
export async function checkUserConsent(userId) {
  try {
    const consent = await consentRepository.getConsent(userId);
    
    if (!consent) {
      return {
        hasConsent: false,
        terms_accepted: false,
        privacy_accepted: false,
        terms_accepted_at: null,
        privacy_accepted_at: null,
        needsUpdate: true
      };
    }
    
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();
    
    // Check if user has accepted both terms and privacy
    const hasAcceptedBoth = consent.terms_accepted && consent.privacy_accepted;
    
    // If user hasn't accepted at all, they need consent
    if (!hasAcceptedBoth) {
      return {
        hasConsent: false,
        terms_accepted: consent.terms_accepted,
        privacy_accepted: consent.privacy_accepted,
        terms_accepted_at: consent.terms_accepted_at,
        privacy_accepted_at: consent.privacy_accepted_at,
        needsUpdate: true
      };
    }
    
    // Check if user has been flagged to update consent (30-day grace period workflow)
    // This is set by admin when policy versions change
    if (consent.requires_consent_update === true) {
      return {
        hasConsent: false,  // Block access, they need to re-consent
        terms_accepted: consent.terms_accepted,
        privacy_accepted: consent.privacy_accepted,
        terms_accepted_at: consent.terms_accepted_at,
        privacy_accepted_at: consent.privacy_accepted_at,
        needsUpdate: true,
        requiresUpdate: true,
        currentVersions: {
          terms: currentTermsVersion,
          privacy: currentPrivacyVersion
        },
        userVersions: {
          terms: consent.terms_version,
          privacy: consent.privacy_version
        }
      };
    }
    
    // Check if versions match current versions
    const hasCurrentTermsVersion = consent.terms_version === currentTermsVersion;
    const hasCurrentPrivacyVersion = consent.privacy_version === currentPrivacyVersion;
    
    // If versions don't match but user hasn't been flagged, they're grandfathered in
    // This handles users who accepted before versioning was implemented (NULL versions)
    const needsUpdate = !hasCurrentTermsVersion || !hasCurrentPrivacyVersion;
    
    return {
      // User has consent if they've accepted both AND haven't been flagged for update
      hasConsent: true,
      terms_accepted: consent.terms_accepted,
      privacy_accepted: consent.privacy_accepted,
      terms_accepted_at: consent.terms_accepted_at,
      privacy_accepted_at: consent.privacy_accepted_at,
      needsUpdate,
      currentVersions: {
        terms: currentTermsVersion,
        privacy: currentPrivacyVersion
      },
      userVersions: {
        terms: consent.terms_version,
        privacy: consent.privacy_version
      }
    };
  } catch (error) {
    return {
      hasConsent: false,
      terms_accepted: false,
      privacy_accepted: false,
      needsUpdate: true,
      error: error.message
    };
  }
}

/**
 * Record terms and privacy consent
 * @param {string} userId - User ID
 * @param {boolean} termsAccepted - Terms accepted
 * @param {boolean} privacyAccepted - Privacy accepted
 * @param {Object} metadata - Request metadata
 * @returns {Promise<Object>} Result
 */
export async function recordTermsAndPrivacyConsent(userId, termsAccepted, privacyAccepted, metadata) {
  try {
    const encrypted = await encryptionService.prepareMetadataForStorage(metadata);
    
    const consentData = {
      userIdHash: hashUserId(userId),
      termsVersion: getCurrentTermsVersion(),
      termsAccepted,
      privacyVersion: getCurrentPrivacyVersion(),
      privacyAccepted,
      encryptedIp: encrypted.agreed_from_ip_encrypted,
      encryptedAgent: encrypted.user_agent_encrypted
    };
    
    const result = await consentRepository.upsertTermsAndPrivacyConsent(consentData);
    
    return {
      success: true,
      message: 'Consent recorded successfully',
      consent: result
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Record data processing consents
 * @param {string} userId - User ID
 * @param {Object} consents - Consent flags
 * @param {Object} metadata - Request metadata
 * @returns {Promise<Object>} Result
 */
export async function recordDataProcessingConsents(userId, consents, metadata) {
  try {
    const encrypted = await encryptionService.prepareMetadataForStorage(metadata);
    
    const consentData = {
      userIdHash: hashUserId(userId),
      consentAstrology: consents.consent_astrology || false,
      consentHealthData: consents.consent_health_data || false,
      consentChatAnalysis: consents.consent_chat_analysis || false,
      encryptedIp: encrypted.agreed_from_ip_encrypted,
      encryptedAgent: encrypted.user_agent_encrypted
    };
    
    const result = await consentRepository.upsertDataProcessingConsents(consentData);
    
    return {
      success: true,
      message: 'Consents recorded successfully',
      consent: result
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get user consents
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Consent data
 */
export async function getUserConsents(userId) {
  const consent = await consentRepository.getConsent(userId);
  
  if (!consent) {
    return {
      terms_accepted: false,
      privacy_accepted: false,
      created_at: null
    };
  }
  
  return {
    terms_accepted: consent.terms_accepted,
    privacy_accepted: consent.privacy_accepted,
    terms_accepted_at: consent.terms_accepted_at,
    privacy_accepted_at: consent.privacy_accepted_at,
    created_at: consent.created_at,
    agreed_from_ip: '[ENCRYPTED]'
  };
}

/**
 * Verify specific consent type
 * @param {string} userId - User ID
 * @param {string} consentType - Consent type
 * @returns {Promise<Object>} Verification result
 */
export async function verifyConsentType(userId, consentType) {
  const validTypes = ['astrology', 'health_data', 'chat_analysis'];
  
  if (!validTypes.includes(consentType)) {
    throw new Error('Invalid consentType. Must be: ' + validTypes.join(', '));
  }
  
  const hasConsent = await consentRepository.getConsentByType(userId, consentType);
  
  return {
    userId,
    consentType,
    hasConsent
  };
}

/**
 * Get consent summary with audit trail
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Summary
 */
export async function getConsentSummary(userId) {
  const [consent, auditHistory] = await Promise.all([
    consentRepository.getConsent(userId),
    consentRepository.getConsentAuditHistory(userId, 10)
  ]);
  
  const currentConsent = consent ? {
    terms_accepted: consent.terms_accepted,
    privacy_accepted: consent.privacy_accepted,
    terms_accepted_at: consent.terms_accepted_at,
    privacy_accepted_at: consent.privacy_accepted_at,
    created_at: consent.created_at,
    agreed_from_ip: '[ENCRYPTED]'
  } : null;
  
  const auditTrail = auditHistory.map(row => ({
    action: row.action,
    timestamp: row.created_at,
    details: row.details,
    ipAddress: '[ENCRYPTED]'
  }));
  
  return {
    userId,
    currentConsents: currentConsent,
    auditTrail
  };
}

export default {
  checkUserConsent,
  recordTermsAndPrivacyConsent,
  recordDataProcessingConsents,
  getUserConsents,
  verifyConsentType,
  getConsentSummary
};
