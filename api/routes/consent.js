import { Router } from 'express';
import { db } from '../shared/db.js';
import { authenticateToken, authorizeUser } from '../middleware/auth.js';
import { logAudit } from '../shared/auditLog.js';
import { hashUserId } from '../shared/hashUtils.js';

const router = Router();

// Current versions (update when T&C changes)
const CURRENT_TERMS_VERSION = "1.0";
const CURRENT_PRIVACY_VERSION = "1.0";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

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

    // Insert or update consent record
    const result = await db.query(
      `INSERT INTO user_consents (
        user_id, user_id_hash,
        consent_astrology, 
        consent_health_data, 
        consent_chat_analysis,
        agreed_from_ip, 
        user_agent,
        agreed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        consent_astrology = $3,
        consent_health_data = $4,
        consent_chat_analysis = $5,
        agreed_from_ip = $6,
        user_agent = $7,
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        userIdHash,
        consent_astrology,
        consent_health_data,
        consent_chat_analysis,
        clientIp,
        userAgent
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
        agreed_at: consentRecord.agreed_at
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
        user_id,
        consent_astrology,
        consent_health_data,
        consent_chat_analysis,
        agreed_at,
        agreed_from_ip
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
        agreed_at: consentRecord.agreed_at
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
        user_id,
        consent_astrology,
        consent_health_data,
        consent_chat_analysis,
        agreed_at,
        agreed_from_ip
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
        agreed_from_ip: currentConsent.agreed_from_ip
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
