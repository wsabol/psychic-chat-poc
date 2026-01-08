/**
 * Version Configuration Management
 * 
 * Centralized management of T&C and Privacy Policy versions
 * When versions change:
 * 1. Update these constants
 * 2. Update public documents (client/public/TERMS_OF_SERVICE.md, privacy.md)
 * 3. Run migration script to flag users for re-acceptance
 * 4. Trigger notification system
 * 
 * Versioning Scheme: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes (mandatory re-acceptance)
 * - MINOR: Significant additions (notify, optional re-acceptance)
 * - PATCH: Clarifications/typos (log only, no notification)
 */

// ============ CURRENT VERSIONS ============
// Update these when documents change
const VERSION_CONFIG = {
  terms: {
    version: process.env.TERMS_VERSION || '1.0',
    changeType: 'MAJOR',  // MAJOR | MINOR | PATCH
    changedAt: process.env.TERMS_CHANGED_AT || '2025-11-24',
    description: 'Initial Terms of Service'
  },
  privacy: {
    version: process.env.PRIVACY_VERSION || '1.0',
    changeType: 'MAJOR',  // MAJOR | MINOR | PATCH
    changedAt: process.env.PRIVACY_CHANGED_AT || '2026-01-01',
    description: 'Initial Privacy Policy with GDPR, CCPA, PIPEDA, LGPD compliance'
  }
};

/**
 * Get current version config
 * @returns {Object} Current version configuration
 */
export function getVersionConfig() {
  return VERSION_CONFIG;
}

/**
 * Get current terms version
 * @returns {string} Current terms version
 */
export function getCurrentTermsVersion() {
  return VERSION_CONFIG.terms.version;
}

/**
 * Get current privacy version
 * @returns {string} Current privacy version
 */
export function getCurrentPrivacyVersion() {
  return VERSION_CONFIG.privacy.version;
}

/**
 * Determine if version change requires mandatory re-acceptance
 * MAJOR changes require re-acceptance before using app
 * MINOR changes are notified but optional
 * PATCH changes are silent (no notification)
 * 
 * @param {string} changeType - 'MAJOR' | 'MINOR' | 'PATCH'
 * @returns {boolean} True if re-acceptance is mandatory
 */
export function isReacceptanceRequired(changeType) {
  return changeType === 'MAJOR';
}

/**
 * Determine if notification should be sent
 * MAJOR and MINOR changes should trigger notifications
 * PATCH changes are silent
 * 
 * @param {string} changeType - 'MAJOR' | 'MINOR' | 'PATCH'
 * @returns {boolean} True if notification should be sent
 */
export function shouldNotifyUsers(changeType) {
  return changeType === 'MAJOR' || changeType === 'MINOR';
}

/**
 * Get notification message for version change
 * @param {string} documentType - 'terms' | 'privacy'
 * @param {string} changeType - 'MAJOR' | 'MINOR' | 'PATCH'
 * @returns {string} Notification message
 */
export function getNotificationMessage(documentType, changeType) {
  const docName = documentType === 'terms' ? 'Terms of Service' : 'Privacy Policy';
  
  if (changeType === 'MAJOR') {
    return `Our ${docName} has been significantly updated. You must review and accept the new version to continue using the app.`;
  }
  
  if (changeType === 'MINOR') {
    return `We've updated our ${docName} with new features and improvements. Please review the changes.`;
  }
  
  return `Our ${docName} has been updated.`;
}

/**
 * Version history (for audit trail)
 * Keep this updated as versions change
 */
export const VERSION_HISTORY = [
  {
    type: 'terms',
    version: '1.0',
    date: '2025-11-24',
    changeType: 'INITIAL',
    description: 'Initial Terms of Service launch',
    changes: [
      'Initial launch of Psychic Chat application',
      'Basic terms covering use license and disclaimers'
    ]
  },
  {
    type: 'privacy',
    version: '1.0',
    date: '2026-01-01',
    changeType: 'INITIAL',
    description: 'Initial Privacy Policy with multi-jurisdiction compliance',
    changes: [
      'GDPR compliance for EU/EEA residents',
      'CCPA compliance for California residents',
      'PIPEDA compliance for Canadian residents',
      'LGPD compliance for Brazilian residents',
      'Detailed data retention policies',
      'User rights documentation'
    ]
  }
  // Add entries as versions update:
  // {
  //   type: 'terms',
  //   version: '1.1',
  //   date: '2026-02-15',
  //   changeType: 'MINOR',
  //   description: 'Clarified astrology disclaimer',
  //   changes: [
  //     'Section 9: Enhanced astrology readings disclaimer',
  //     'Clearer explanation of entertainment-only nature'
  //   ]
  // }
];

/**
 * Get version history for a specific document
 * @param {string} documentType - 'terms' | 'privacy'
 * @returns {Array} Version history entries
 */
export function getVersionHistory(documentType) {
  return VERSION_HISTORY.filter(entry => entry.type === documentType);
}

/**
 * Export all config for use in routes
 */
export default VERSION_CONFIG;
