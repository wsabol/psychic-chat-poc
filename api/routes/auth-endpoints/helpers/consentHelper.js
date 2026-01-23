import { db } from '../../../shared/db.js';
import { hashUserId } from '../../../shared/hashUtils.js';
import { 
  getCurrentTermsVersion, 
  getCurrentPrivacyVersion 
} from '../../../shared/versionConfig.js';

/**
 * Check if user has accepted T&C and privacy policy
 * Returns: { hasConsent: boolean, terms_accepted: boolean, privacy_accepted: boolean }
 */
export async function checkUserConsent(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    // Get current versions from .env
    const currentTermsVersion = getCurrentTermsVersion();
    const currentPrivacyVersion = getCurrentPrivacyVersion();
    
    const result = await db.query(
      `SELECT 
        terms_accepted, 
        privacy_accepted, 
        terms_accepted_at, 
        privacy_accepted_at,
        terms_version,
        privacy_version
       FROM user_consents 
       WHERE user_id_hash = $1`,
      [userIdHash]
    );
    
    if (result.rows.length === 0) {
      return {
        hasConsent: false,
        terms_accepted: false,
        privacy_accepted: false,
        terms_accepted_at: null,
        privacy_accepted_at: null,
        needsUpdate: true
      };
    }
    
    const consent = result.rows[0];
    
    // Check if user has accepted AND if they have the current versions
    const hasCurrentTermsVersion = consent.terms_version === currentTermsVersion;
    const hasCurrentPrivacyVersion = consent.privacy_version === currentPrivacyVersion;
    const needsUpdate = !hasCurrentTermsVersion || !hasCurrentPrivacyVersion;
    
    return {
      hasConsent: consent.terms_accepted && consent.privacy_accepted && !needsUpdate,
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
 * Record user T&C and privacy acceptance
 * Returns: { success: boolean, message: string }
 */
export async function recordUserConsent(userId, termsAccepted, privacyAccepted, clientIp, userAgent) {
  try {
    const userIdHash = hashUserId(userId);
    
    // NOTE: We do NOT check if user exists in user_personal_info
    // Users can accept consent before their profile is fully created
    // This is critical during signup/free trial flow
    
    // Encrypt IP and user agent
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    let encryptedIp = null;
    let encryptedAgent = null;
    
    if (clientIp && ENCRYPTION_KEY) {
      try {
        const result = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [clientIp, ENCRYPTION_KEY]
        );
        encryptedIp = result.rows[0]?.encrypted;
            } catch (e) {
      }
    }
    
    if (userAgent && ENCRYPTION_KEY) {
      try {
        const result = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [userAgent, ENCRYPTION_KEY]
        );
        encryptedAgent = result.rows[0]?.encrypted;
            } catch (e) {
      }
    }
    
    // Insert or update consent with current versions
    const timestampNow = new Date().toISOString();
    const termsVersion = getCurrentTermsVersion();
    const privacyVersion = getCurrentPrivacyVersion();
    
    await db.query(
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
        terms_version = CASE WHEN $3 THEN $2 ELSE user_consents.terms_version END,
        terms_accepted = CASE WHEN $3 THEN true ELSE user_consents.terms_accepted END,
        terms_accepted_at = CASE WHEN $3 THEN NOW() ELSE user_consents.terms_accepted_at END,
        privacy_version = CASE WHEN $6 THEN $5 ELSE user_consents.privacy_version END,
        privacy_accepted = CASE WHEN $6 THEN true ELSE user_consents.privacy_accepted END,
        privacy_accepted_at = CASE WHEN $6 THEN NOW() ELSE user_consents.privacy_accepted_at END,
        agreed_from_ip_encrypted = $8,
        user_agent_encrypted = $9,
        requires_consent_update = false,
        updated_at = NOW()`,
      [
        userIdHash,
        termsVersion,
        termsAccepted,
        termsAccepted ? timestampNow : null,
        privacyVersion,
        privacyAccepted,
        privacyAccepted ? timestampNow : null,
        encryptedIp,
        encryptedAgent
      ]
    );
    
    return {
      success: true,
      message: 'Consent recorded successfully'
    };
    } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}
