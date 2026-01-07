import { db } from '../../../shared/db.js';
import { hashUserId } from '../../../shared/hashUtils.js';

/**
 * Check if user has accepted T&C and privacy policy
 * Returns: { hasConsent: boolean, terms_accepted: boolean, privacy_accepted: boolean }
 */
export async function checkUserConsent(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    const result = await db.query(
      `SELECT terms_accepted, privacy_accepted, terms_accepted_at, privacy_accepted_at
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
        privacy_accepted_at: null
      };
    }
    
    const consent = result.rows[0];
    return {
      hasConsent: consent.terms_accepted && consent.privacy_accepted,
      terms_accepted: consent.terms_accepted,
      privacy_accepted: consent.privacy_accepted,
      terms_accepted_at: consent.terms_accepted_at,
      privacy_accepted_at: consent.privacy_accepted_at
    };
  } catch (error) {
    console.error('[CONSENT-CHECK] Error:', error);
    return {
      hasConsent: false,
      terms_accepted: false,
      privacy_accepted: false,
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
    
    // Verify user exists
    const userExists = await db.query(
      'SELECT user_id FROM user_personal_info WHERE user_id = $1',
      [userId]
    );
    
    if (userExists.rows.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
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
        console.warn('[CONSENT] Failed to encrypt IP:', e.message);
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
        console.warn('[CONSENT] Failed to encrypt user agent:', e.message);
      }
    }
    
    // Insert or update consent
    const timestampNow = new Date().toISOString();
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
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (user_id_hash) DO UPDATE SET
        terms_accepted = $3,
        privacy_accepted = $6,
        terms_accepted_at = $4,
        privacy_accepted_at = $7,
        agreed_from_ip_encrypted = $8,
        user_agent_encrypted = $9,
        updated_at = NOW()`,
      [
        userIdHash,
        '1.0', // terms_version
        termsAccepted,
        termsAccepted ? timestampNow : null,
        '1.0', // privacy_version
        privacyAccepted,
        privacyAccepted ? timestampNow : null,
        encryptedIp,
        encryptedAgent
      ]
    );
    
    console.log('[CONSENT] Consent recorded for user:', userId);
    
    return {
      success: true,
      message: 'Consent recorded successfully'
    };
  } catch (error) {
    console.error('[CONSENT-RECORD] Error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
