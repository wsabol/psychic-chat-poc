import { Router } from 'express';
import { db } from '../shared/db.js';
import { authenticateToken, authorizeUser } from '../middleware/auth.js';
import { logAudit } from '../shared/auditLog.js';
import { hashUserId } from '../shared/hashUtils.js';
import { getEncryptionKey } from '../shared/decryptionHelper.js';
import { checkUserConsent, recordUserConsent } from './auth-endpoints/helpers/consentHelper.js';

const router = Router();

// Current versions (update when T&C changes)
const CURRENT_TERMS_VERSION = "1.0";
const CURRENT_PRIVACY_VERSION = "1.0";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * POST /auth/check-consent/:userId
 * Check if user has accepted T&C and privacy
 */
router.post('/check-consent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const consentStatus = await checkUserConsent(userId);
    return res.json(consentStatus);
  } catch (error) {
    console.error('[CONSENT-CHECK] Error:', error);
    return res.status(500).json({ error: error.message });
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
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';
    
    const result = await recordUserConsent(userId, terms_accepted, privacy_accepted, clientIp, userAgent);
    
    if (result.success) {
      return res.json({ success: true, message: result.message });
    } else {
      return res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('[CONSENT-RECORD] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auth/consent/terms-acceptance
 * Record or update user T&C acceptance during registration
 * Called by client during signup flow
 */
router.post('/consent/terms-acceptance', async (req, res) => {
  console.log('[CONSENT-DEBUG] *** ENDPOINT HIT: /auth/consent/terms-acceptance ***');
  console.log('[CONSENT-DEBUG] Request body:', req.body);
  try {
    const userId = req.body.userId;
    const { terms_accepted = false, privacy_accepted = false } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const userIdHash = hashUserId(userId);

    // Validate that user exists
    const userExists = await db.query(
      'SELECT user_id FROM user_personal_info WHERE user_id = $1',
      [userId]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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
        console.warn('[CONSENT] Failed to encrypt user_agent:', encErr.message);
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
        console.warn('[CONSENT] Failed to encrypt agreed_from_ip:', encErr.message);
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
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (user_id_hash) DO UPDATE SET
        terms_version = $2,
        terms_accepted = $3,
        terms_accepted_at = CASE WHEN $3 THEN NOW() ELSE terms_accepted_at END,
        privacy_version = $5,
        privacy_accepted = $6,
        privacy_accepted_at = CASE WHEN $6 THEN NOW() ELSE privacy_accepted_at END,
        agreed_from_ip_encrypted = $8,
        user_agent_encrypted = $9,
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
    console.error('[CONSENT] Error recording T&C acceptance:', error);
    
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

    return res.status(500).json({ 
      error: 'Failed to record T&C acceptance', 
      details: error.message 
    });
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
      return res.status(400).json({ error: 'userId required' });
    }

    const userIdHash = hashUserId(userId);

    // Validate that user exists
    const userExists = await db.query(
      'SELECT user_id FROM user_personal_info WHERE user_id = $1',
      [userId]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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
        console.warn('[CONSENT] Failed to encrypt user_agent:', encErr.message);
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
        console.warn('[CONSENT] Failed to encrypt agreed_from_ip:', encErr.message);
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
    console.error('[CONSENT] Error recording consent:', error);
    
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

    return res.status(500).json({ 
      error: 'Failed to record consent', 
      details: error.message 
    });
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
      return res.status(400).json({ error: 'userId required' });
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
    console.error('[CONSENT] Error retrieving consent:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve consent', 
      details: error.message 
    });
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
      return res.status(400).json({ error: 'userId and consentType required' });
    }

    const userIdHash = hashUserId(userId);

    // Validate consent type
    const validTypes = ['astrology', 'health_data', 'chat_analysis'];
    if (!validTypes.includes(consentType)) {
      return res.status(400).json({ 
        error: 'Invalid consentType. Must be: ' + validTypes.join(', ')
      });
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
    console.error('[CONSENT] Error verifying consent:', error);
    return res.status(500).json({ 
      error: 'Failed to verify consent', 
      details: error.message 
    });
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
      return res.status(400).json({ error: 'userId required' });
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
    console.error('[CONSENT] Error retrieving consent summary:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve consent summary', 
      details: error.message 
    });
  }
});

export default router;
