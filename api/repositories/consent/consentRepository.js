/**
 * Consent Repository
 * Handles all database operations for consent management
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

/**
 * Get user consent record
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Consent record or null
 */
export async function getConsent(userId) {
  const userIdHash = hashUserId(userId);
  
  const result = await db.query(
    `SELECT 
      terms_version,
      terms_accepted,
      terms_accepted_at,
      privacy_version,
      privacy_accepted,
      privacy_accepted_at,
      consent_astrology,
      consent_health_wellness,
      consent_chat_analysis,
      requires_consent_update,
      last_notified_at,
      notification_count,
      created_at,
      updated_at
    FROM user_consents 
    WHERE user_id_hash = $1`,
    [userIdHash]
  );
  
  return result.rows[0] || null;
}

/**
 * Upsert terms and privacy consent
 * @param {Object} data - Consent data
 * @returns {Promise<Object>} Created/updated consent record
 */
export async function upsertTermsAndPrivacyConsent(data) {
  const {
    userIdHash,
    termsVersion,
    termsAccepted,
    privacyVersion,
    privacyAccepted,
    encryptedIp,
    encryptedAgent
  } = data;
  
  const result = await db.query(
    `INSERT INTO user_consents (
      user_id_hash,
      terms_version,
      terms_accepted,
      terms_accepted_at,
      privacy_version,
      privacy_accepted,
      privacy_accepted_at,
      agreed_from_ip_encrypted,
      user_agent_encrypted,
      requires_consent_update,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW(), NOW())
    ON CONFLICT (user_id_hash) DO UPDATE SET
      terms_version = CASE WHEN excluded.terms_accepted THEN $2 ELSE user_consents.terms_version END,
      terms_accepted = $3,
      terms_accepted_at = CASE WHEN $3 THEN NOW() ELSE user_consents.terms_accepted_at END,
      privacy_version = CASE WHEN excluded.privacy_accepted THEN $5 ELSE user_consents.privacy_version END,
      privacy_accepted = $6,
      privacy_accepted_at = CASE WHEN $6 THEN NOW() ELSE user_consents.privacy_accepted_at END,
      agreed_from_ip_encrypted = $8,
      user_agent_encrypted = $9,
      requires_consent_update = false,
      updated_at = NOW()
    RETURNING *`,
    [
      userIdHash,
      termsVersion,
      termsAccepted,
      termsAccepted ? new Date().toISOString() : null,
      privacyVersion,
      privacyAccepted,
      privacyAccepted ? new Date().toISOString() : null,
      encryptedIp,
      encryptedAgent
    ]
  );
  
  return result.rows[0];
}

/**
 * Upsert data processing consents (astrology, health, chat)
 * @param {Object} data - Consent data
 * @returns {Promise<Object>} Created/updated consent record
 */
export async function upsertDataProcessingConsents(data) {
  const {
    userIdHash,
    consentAstrology,
    consentHealthData,
    consentChatAnalysis,
    encryptedIp,
    encryptedAgent
  } = data;
  
  const result = await db.query(
    `INSERT INTO user_consents (
      user_id_hash,
      consent_astrology, 
      consent_health_data, 
      consent_chat_analysis,
      agreed_from_ip_encrypted, 
      user_agent_encrypted,
      agreed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (user_id_hash) DO UPDATE SET
      consent_astrology = $2,
      consent_health_data = $3,
      consent_chat_analysis = $4,
      agreed_from_ip_encrypted = $5,
      user_agent_encrypted = $6,
      updated_at = NOW()
    RETURNING *`,
    [
      userIdHash,
      consentAstrology,
      consentHealthData,
      consentChatAnalysis,
      encryptedIp,
      encryptedAgent
    ]
  );
  
  return result.rows[0];
}

/**
 * Get specific consent type value
 * @param {string} userId - User ID
 * @param {string} consentType - Consent type (astrology, health_data, chat_analysis)
 * @returns {Promise<boolean>} Whether user has given this consent
 */
export async function getConsentByType(userId, consentType) {
  const userIdHash = hashUserId(userId);
  
  const consentColumnMap = {
    'astrology': 'consent_astrology',
    'health_data': 'consent_health_data',
    'chat_analysis': 'consent_chat_analysis'
  };
  
  const columnName = consentColumnMap[consentType];
  if (!columnName) {
    throw new Error(`Invalid consent type: ${consentType}`);
  }
  
  const result = await db.query(
    `SELECT ${columnName} as has_consent 
     FROM user_consents 
     WHERE user_id_hash = $1`,
    [userIdHash]
  );
  
  return result.rows.length > 0 ? result.rows[0].has_consent : false;
}

/**
 * Get consent audit history
 * @param {string} userId - User ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Audit trail
 */
export async function getConsentAuditHistory(userId, limit = 10) {
  const userIdHash = hashUserId(userId);
  
  const result = await db.query(
    `SELECT 
      action,
      created_at,
      details,
      ip_address_encrypted
    FROM audit_log 
    WHERE user_id_hash = $1 AND action LIKE 'CONSENT%'
    ORDER BY created_at DESC
    LIMIT $2`,
    [userIdHash, limit]
  );
  
  return result.rows;
}

/**
 * Check if notifications have been sent for current version
 * @param {string} termsVersion - Current terms version
 * @param {string} privacyVersion - Current privacy version
 * @returns {Promise<Object>} Notification status
 */
export async function checkNotificationsSent(termsVersion, privacyVersion) {
  const result = await db.query(`
    SELECT COUNT(*) as notified_count,
           MAX(last_notified_at) as last_notification
    FROM user_consents
    WHERE (terms_version != $1 OR privacy_version != $2)
      AND requires_consent_update = true
      AND last_notified_at IS NOT NULL
      AND last_notified_at > NOW() - INTERVAL '7 days'
  `, [termsVersion, privacyVersion]);
  
  return {
    notifiedCount: parseInt(result.rows[0]?.notified_count || 0),
    lastNotification: result.rows[0]?.last_notification
  };
}

export default {
  getConsent,
  upsertTermsAndPrivacyConsent,
  upsertDataProcessingConsents,
  getConsentByType,
  getConsentAuditHistory,
  checkNotificationsSent
};
