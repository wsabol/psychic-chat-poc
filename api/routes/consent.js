import { Router } from 'express';
import { db } from '../shared/db.js';
import { authenticateToken, authorizeUser } from '../middleware/auth.js';
import { logAudit } from '../shared/auditLog.js';
import { hashUserId } from '../shared/hashUtils.js';
import { getEncryptionKey } from '../shared/decryptionHelper.js';
import { checkUserConsent, recordUserConsent } from './auth-endpoints/helpers/consentHelper.js';
import { checkUserCompliance, getComplianceReport, getUsersRequiringAction, markUserNotified } from '../shared/complianceChecker.js';
import { getCurrentTermsVersion, getCurrentPrivacyVersion } from '../shared/versionConfig.js';
import VERSION_CONFIG from '../shared/versionConfig.js';

const router = Router();

// Use version config from centralized location
const CURRENT_TERMS_VERSION = getCurrentTermsVersion();
const CURRENT_PRIVACY_VERSION = getCurrentPrivacyVersion();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * POST /auth/check-consent/:userId
 * Check if user has accepted T&C and privacy
 */
router.post('/check-consent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return validationError(res, 'userId required');
    
    const consentStatus = await checkUserConsent(userId);
    return res.json(consentStatus);
    } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /auth/record-consent/:userId
 * Record user consent
 */
router.post('/record-consent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { terms_accepted = false, privacy_accepted = false } = req.body;
    if (!userId) return validationError(res, 'userId required');
    
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';
    
    const result = await recordUserConsent(userId, terms_accepted, privacy_accepted, clientIp, userAgent);
    
    if (result.success) {
      return res.json({ success: true, message: result.message });
    } else {
      return validationError(res, result.message);
    }
    } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /auth/consent/terms-acceptance
 * Record or update user T&C acceptance during registration
 * Called by client during signup flow
 */
router.post('/consent/terms-acceptance', async (req, res) => {
  try {
    const userId = req.body.userId;
    const { terms_accepted = false, privacy_accepted = false } = req.body;

    if (!userId) {
      return validationError(res, 'userId required');
    }

    const userIdHash = hashUserId(userId);

    // NOTE: We do NOT check if user exists in user_personal_info
    // Users can accept consent during signup before their profile is created

    // Get client IP and user agent for consent proof
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';
    const ENCRYPTION_KEY_LOCAL = getEncryptionKey();
    
    // Encrypt user_agent and ip_address
    let encryptedUserAgent = null;
    let encryptedIpAddress = null;
        if (userAgent) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [userAgent, ENCRYPTION_KEY_LOCAL]
        );
        encryptedUserAgent = encResult.rows[0]?.encrypted;
      } catch (encErr) {
      }
    }
    if (clientIp) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [clientIp, ENCRYPTION_KEY_LOCAL]
        );
        encryptedIpAddress = encResult.rows[0]?.encrypted;
      } catch (encErr) {
      }
    }

    // Insert or update T&C acceptance record
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
        CURRENT_TERMS_VERSION,
        terms_accepted,
        terms_accepted ? new Date().toISOString() : null,
        CURRENT_PRIVACY_VERSION,
        privacy_accepted,
        privacy_accepted ? new Date().toISOString() : null,
        encryptedIpAddress,
        encryptedUserAgent
      ]
    );

    const consentRecord = result.rows[0];

    // Log audit event
    await logAudit(db, {
      userId,
      action: 'CONSENT_T&C_RECORDED',
      resourceType: 'compliance',
      ipAddress: clientIp,
      userAgent,
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        terms_accepted,
        privacy_accepted,
        agreed_from_ip: clientIp
      }
    });

    return res.json({
      success: true,
      message: 'T&C acceptance recorded successfully',
      userId,
      consents: {
        terms_accepted: consentRecord.terms_accepted,
        privacy_accepted: consentRecord.privacy_accepted,
        terms_accepted_at: consentRecord.terms_accepted_at,
        privacy_accepted_at: consentRecord.privacy_accepted_at,
        agreed_from_ip: '[ENCRYPTED]'
      }
    });

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
});

/**
 * POST /auth/consents
 * Record or update user consent for data processing
 */
router.post('/consents', async (req, res) => {
  try {
    const userId = req.body.userId || req.params.userId;
    const { 
      consent_astrology = false, 
      consent_health_data = false, 
      consent_chat_analysis = false 
    } = req.body;

    if (!userId) {
      return validationError(res, 'userId required');
    }

    const userIdHash = hashUserId(userId);

    // NOTE: We do NOT check if user exists in user_personal_info
    // Users can consent during signup before profile is fully created

    // Get client IP and user agent for consent proof
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';
    const ENCRYPTION_KEY = getEncryptionKey();
    
    // Encrypt user_agent and ip_address
    let encryptedUserAgent = null;
    let encryptedIpAddress = null;
        if (userAgent) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [userAgent, ENCRYPTION_KEY]
        );
        encryptedUserAgent = encResult.rows[0]?.encrypted;
      } catch (encErr) {
      }
    }
    if (clientIp) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [clientIp, ENCRYPTION_KEY]
        );
        encryptedIpAddress = encResult.rows[0]?.encrypted;
      } catch (encErr) {
      }
    }

    // Insert or update consent record
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
        -- NOTE: DO NOT override terms_accepted, privacy_accepted, or their versions
      RETURNING *`,
      [
        userIdHash,
        consent_astrology,
        consent_health_data,
        consent_chat_analysis,
        encryptedIpAddress,
        encryptedUserAgent
      ]
    );

    const consentRecord = result.rows[0];

    // Log audit event
    await logAudit(db, {
      userId,
      action: 'CONSENT_RECORDED',
      resourceType: 'compliance',
      ipAddress: clientIp,
      userAgent,
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        consent_astrology,
        consent_health_data,
        consent_chat_analysis,
        agreed_from_ip: clientIp
      }
    });

    return res.json({
      success: true,
      message: 'Consents recorded successfully',
      userId,
      consents: {
        consent_astrology: consentRecord.consent_astrology,
        consent_health_data: consentRecord.consent_health_data,
        consent_chat_analysis: consentRecord.consent_chat_analysis,
        agreed_at: consentRecord.agreed_at,
        agreed_from_ip: '[ENCRYPTED]'
      }
    });

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
});

/**
 * GET /auth/consents/:userId
 * Retrieve user's current consent status
 */
router.get('/consents/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return validationError(res, 'userId required');
    }

    const userIdHash = hashUserId(userId);

    // Fetch consent record
    const result = await db.query(
      `SELECT 
        consent_astrology,
        consent_health_data,
        consent_chat_analysis,
        agreed_at
      FROM user_consents 
      WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (result.rows.length === 0) {
      // User has not provided consent yet
      return res.json({
        success: true,
        userId,
        consents: {
          consent_astrology: false,
          consent_health_data: false,
          consent_chat_analysis: false,
          agreed_at: null
        },
        message: 'No consent record found - user needs to consent'
      });
    }

    const consentRecord = result.rows[0];

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

    return res.json({
      success: true,
      userId,
      consents: {
        consent_astrology: consentRecord.consent_astrology,
        consent_health_data: consentRecord.consent_health_data,
        consent_chat_analysis: consentRecord.consent_chat_analysis,
        agreed_at: consentRecord.agreed_at,
        agreed_from_ip: '[ENCRYPTED]'
      }
    });

    } catch (error) {
    return serverError(res, 'Failed to retrieve consent');
  }
});

/**
 * POST /auth/verify-consent/:userId/:consentType
 * Check if user has specific consent before performing action
 */
router.post('/verify-consent/:userId/:consentType', async (req, res) => {
  try {
    const { userId, consentType } = req.params;

    if (!userId || !consentType) {
      return validationError(res, 'userId and consentType required');
    }

    const userIdHash = hashUserId(userId);

    // Validate consent type
    const validTypes = ['astrology', 'health_data', 'chat_analysis'];
    if (!validTypes.includes(consentType)) {
      return validationError(res, 'Invalid consentType. Must be: ' + validTypes.join(', '));
    }

    // Map consent type to column name
    const consentColumnMap = {
      'astrology': 'consent_astrology',
      'health_data': 'consent_health_data',
      'chat_analysis': 'consent_chat_analysis'
    };

    const columnName = consentColumnMap[consentType];

    // Fetch consent value
    const result = await db.query(
      `SELECT ${columnName} as has_consent 
       FROM user_consents 
       WHERE user_id_hash = $1`,
      [userIdHash]
    );

    const hasConsent = result.rows.length > 0 ? result.rows[0].has_consent : false;

    return res.json({
      success: true,
      userId,
      consentType,
      hasConsent
    });

    } catch (error) {
    return serverError(res, 'Failed to verify consent');
  }
});

/**
 * GET /auth/consent-summary/:userId
 * Get summary of user's consent status and audit trail
 */
router.get('/consent-summary/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return validationError(res, 'userId required');
    }

    const userIdHash = hashUserId(userId);

    // Get current consent
    const consentResult = await db.query(
      `SELECT 
        consent_astrology,
        consent_health_data,
        consent_chat_analysis,
        agreed_at
      FROM user_consents 
      WHERE user_id_hash = $1`,
      [userIdHash]
    );

    // Get consent audit history
    const auditResult = await db.query(
      `SELECT 
        action,
        created_at,
        details,
        ip_address_encrypted
      FROM audit_log 
      WHERE user_id_hash = $1 AND action LIKE 'CONSENT%'
      ORDER BY created_at DESC
      LIMIT 10`,
      [userIdHash]
    );

    const currentConsent = consentResult.rows[0] || null;

    return res.json({
      success: true,
      userId,
      currentConsents: currentConsent ? {
        consent_astrology: currentConsent.consent_astrology,
        consent_health_data: currentConsent.consent_health_data,
        consent_chat_analysis: currentConsent.consent_chat_analysis,
        agreed_at: currentConsent.agreed_at,
        agreed_from_ip: '[ENCRYPTED]'
      } : null,
      auditTrail: auditResult.rows.map(row => ({
        action: row.action,
        timestamp: row.created_at,
        details: row.details,
        ipAddress: '[ENCRYPTED]'
      }))
    });

    } catch (error) {
    return serverError(res, 'Failed to retrieve consent summary');
  }
});

/**
 * POST /auth/check-compliance/:userId
 * Check if user's consent is compliant with current versions
 */
router.post('/check-compliance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return validationError(res, 'userId required');
    
    const compliance = await checkUserCompliance(userId);
    return res.json(compliance);
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /auth/compliance-report
 * Get compliance statistics (admin only)
 */
router.post('/compliance-report', authenticateToken, async (req, res) => {
  try {
    const report = await getComplianceReport();
    return res.json(report);
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /auth/users-requiring-action
 * Get list of users who need to re-accept terms (admin only)
 */
router.post('/users-requiring-action', authenticateToken, async (req, res) => {
  try {
    const result = await getUsersRequiringAction();
    return res.json(result);
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /auth/mark-user-notified/:userId
 * Mark that user has been notified of version change
 */
router.post('/mark-user-notified/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return validationError(res, 'userId required');
    
    const result = await markUserNotified(userId);
    return res.json(result);
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * GET /auth/version-config
 * Get current version configuration (public)
 */
router.get('/version-config', (req, res) => {
  return res.json({
    success: true,
    versions: {
      terms: {
        version: CURRENT_TERMS_VERSION,
        changeType: VERSION_CONFIG.terms.changeType,
        changedAt: VERSION_CONFIG.terms.changedAt,
        description: VERSION_CONFIG.terms.description
      },
      privacy: {
        version: CURRENT_PRIVACY_VERSION,
        changeType: VERSION_CONFIG.privacy.changeType,
        changedAt: VERSION_CONFIG.privacy.changedAt,
        description: VERSION_CONFIG.privacy.description
      }
    }
  });
});

export default router;
