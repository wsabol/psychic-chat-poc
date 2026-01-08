/**
 * Compliance Checker Utility
 * 
 * Functions for checking version compliance status of users
 * and flagging those who need to update their consent
 */

import { db } from './db.js';
import { hashUserId } from './hashUtils.js';
import { 
  getCurrentTermsVersion, 
  getCurrentPrivacyVersion,
  isReacceptanceRequired,
  shouldNotifyUsers
} from './versionConfig.js';
import VERSION_CONFIG from './versionConfig.js';
import { logAudit } from './auditLog.js';

/**
 * Check user's compliance status
 * Compares user's accepted versions against current versions
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Compliance status
 */
export async function checkUserCompliance(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    // Get user's current consent record
    const result = await db.query(
      `SELECT 
        terms_version,
        terms_accepted,
        terms_accepted_at,
        privacy_version,
        privacy_accepted,
        privacy_accepted_at,
        requires_consent_update,
        last_notified_at,
        notification_count
      FROM user_consents 
      WHERE user_id_hash = $1`,
      [userIdHash]
    );
    
    if (result.rows.length === 0) {
      // User has no consent record yet
      return {
        userId,
        compliant: false,
        reason: 'NO_CONSENT_RECORD',
        needsTerms: true,
        needsPrivacy: true,
        requiresImmediateAction: true,
        blocksAccess: true
      };
    }
    
    const consent = result.rows[0];
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();
    
    // Check if versions match
    const termsOutOfDate = consent.terms_version !== currentTermsVersion;
    const privacyOutOfDate = consent.privacy_version !== currentPrivacyVersion;
    
    // Check if user needs to re-accept (MAJOR version changes)
    const termsRequiresReacceptance = termsOutOfDate && 
      isReacceptanceRequired(VERSION_CONFIG.terms.changeType);
    const privacyRequiresReacceptance = privacyOutOfDate && 
      isReacceptanceRequired(VERSION_CONFIG.privacy.changeType);
    
    const compliant = !termsOutOfDate && !privacyOutOfDate;
    const blocksAccess = termsRequiresReacceptance || privacyRequiresReacceptance;
    
    return {
      userId,
      compliant,
      requiresImmediateAction: blocksAccess,
      blocksAccess,
      
      // Terms status
      termsCompliant: !termsOutOfDate,
      termsVersion: {
        accepted: consent.terms_version,
        current: currentTermsVersion,
        outOfDate: termsOutOfDate,
        requiresReacceptance: termsRequiresReacceptance,
        acceptedAt: consent.terms_accepted_at,
        acceptedBy: consent.terms_accepted
      },
      
      // Privacy status
      privacyCompliant: !privacyOutOfDate,
      privacyVersion: {
        accepted: consent.privacy_version,
        current: currentPrivacyVersion,
        outOfDate: privacyOutOfDate,
        requiresReacceptance: privacyRequiresReacceptance,
        acceptedAt: consent.privacy_accepted_at,
        acceptedBy: consent.privacy_accepted
      },
      
      // Notification tracking
      requiresConsent: consent.requires_consent_update,
      lastNotified: consent.last_notified_at,
      notificationCount: consent.notification_count
    };
  } catch (error) {
    console.error('[COMPLIANCE] Error checking user compliance:', error);
    throw error;
  }
}

/**
 * Flag users who need to update their consent
 * Called when versions change in VERSION_CONFIG
 * 
 * @param {string} documentType - 'terms' | 'privacy' | 'both'
 * @returns {Promise<Object>} Number of users flagged
 */
export async function flagUsersForUpdate(documentType = 'both') {
  try {
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();
    
    let query = 'UPDATE user_consents SET requires_consent_update = true, updated_at = NOW()';
    let conditions = [];
    
    if (documentType === 'terms' || documentType === 'both') {
      conditions.push(`terms_version != $1`);
    }
    if (documentType === 'privacy' || documentType === 'both') {
      conditions.push(`privacy_version != $2`);
    }
    
    if (conditions.length === 0) return { flagged: 0 };
    
    query += ` WHERE ${conditions.join(' OR ')}`;
    
    const params = [];
    if (documentType === 'terms' || documentType === 'both') params.push(currentTermsVersion);
    if (documentType === 'privacy' || documentType === 'both') params.push(currentPrivacyVersion);
    
    const result = await db.query(query, params);
    
    return {
      flagged: result.rowCount,
      documentType,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[COMPLIANCE] Error flagging users:', error);
    throw error;
  }
}

/**
 * Get compliance report
 * Shows adoption rates for current versions
 * 
 * @returns {Promise<Object>} Compliance report
 */
export async function getComplianceReport() {
  try {
    const result = await db.query(`
      SELECT 
        'terms' as document_type,
        terms_version as version,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE terms_accepted = true) as accepted_count,
        COUNT(*) FILTER (WHERE terms_accepted = true) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_percentage,
        COUNT(*) FILTER (WHERE requires_consent_update = true) as requires_action_count,
        MAX(terms_accepted_at) as latest_acceptance
      FROM user_consents
      GROUP BY terms_version
      
      UNION ALL
      
      SELECT 
        'privacy' as document_type,
        privacy_version as version,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE privacy_accepted = true) as accepted_count,
        COUNT(*) FILTER (WHERE privacy_accepted = true) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_percentage,
        COUNT(*) FILTER (WHERE requires_consent_update = true) as requires_action_count,
        MAX(privacy_accepted_at) as latest_acceptance
      FROM user_consents
      GROUP BY privacy_version
      ORDER BY version DESC
    `);
    
    return {
      timestamp: new Date().toISOString(),
      currentVersions: {
        terms: getCurrentTermsVersion(),
        privacy: getCurrentPrivacyVersion()
      },
      adoptionByVersion: result.rows,
      totalUsers: await getTotalUserCount()
    };
  } catch (error) {
    console.error('[COMPLIANCE] Error getting report:', error);
    throw error;
  }
}

/**
 * Get list of users requiring immediate action
 * (Those with MAJOR version changes)
 * 
 * @returns {Promise<Array>} List of users needing update
 */
export async function getUsersRequiringAction() {
  try {
    const result = await db.query(`
      SELECT DISTINCT
        user_id_hash,
        requires_consent_update,
        last_notified_at,
        notification_count,
        terms_version,
        privacy_version,
        (
          SELECT COUNT(*) FROM messages 
          WHERE user_id_hash = user_consents.user_id_hash 
          AND created_at > NOW() - INTERVAL '7 days'
        ) as recent_activity_count
      FROM user_consents
      WHERE requires_consent_update = true
      ORDER BY last_notified_at ASC NULLS FIRST
      LIMIT 1000
    `);
    
    return {
      count: result.rows.length,
      users: result.rows
    };
  } catch (error) {
    console.error('[COMPLIANCE] Error getting users requiring action:', error);
    throw error;
  }
}

/**
 * Mark user as notified of version change
 * Updates last_notified_at and increments notification_count
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export async function markUserNotified(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await db.query(
      `UPDATE user_consents 
       SET last_notified_at = NOW(), 
           notification_count = COALESCE(notification_count, 0) + 1,
           updated_at = NOW()
       WHERE user_id_hash = $1
       RETURNING last_notified_at, notification_count`,
      [userIdHash]
    );
    
    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    return {
      success: true,
      userId,
      notifiedAt: result.rows[0].last_notified_at,
      notificationCount: result.rows[0].notification_count
    };
  } catch (error) {
    console.error('[COMPLIANCE] Error marking user notified:', error);
    throw error;
  }
}

/**
 * Clear compliance flag after user re-accepts
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Clear result
 */
export async function clearComplianceFlagForUser(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await db.query(
      `UPDATE user_consents 
       SET requires_consent_update = false,
           updated_at = NOW()
       WHERE user_id_hash = $1
       RETURNING requires_consent_update`,
      [userIdHash]
    );
    
    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    return {
      success: true,
      userId,
      complianceFlagCleared: true
    };
  } catch (error) {
    console.error('[COMPLIANCE] Error clearing compliance flag:', error);
    throw error;
  }
}

/**
 * Get total user count
 * @returns {Promise<number>} Total number of users
 */
async function getTotalUserCount() {
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM user_personal_info');
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('[COMPLIANCE] Error getting user count:', error);
    return 0;
  }
}

export default {
  checkUserCompliance,
  flagUsersForUpdate,
  getComplianceReport,
  getUsersRequiringAction,
  markUserNotified,
  clearComplianceFlagForUser
};
