/**
 * Consent Verification Middleware
 * Checks if user has required consent before allowing specific actions
 */

import { db } from '../shared/db.js';

/**
 * Middleware factory: Verify user has specific consent
 * @param {string} consentType - 'astrology' | 'health_data' | 'chat_analysis'
 * @returns {function} Express middleware
 */
export function requireConsent(consentType) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.uid || req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Map consent type to column name
      const consentColumnMap = {
        'astrology': 'consent_astrology',
        'health_data': 'consent_health_data',
        'chat_analysis': 'consent_chat_analysis'
      };

      const columnName = consentColumnMap[consentType];
      if (!columnName) {
        return res.status(400).json({ error: 'Invalid consent type' });
      }

      // Check consent in database
      const result = await db.query(
        `SELECT ${columnName} as has_consent 
         FROM user_consents 
         WHERE user_id = $1`,
        [userId]
      );

      const hasConsent = result.rows.length > 0 ? result.rows[0].has_consent : false;

      if (!hasConsent) {
        return res.status(403).json({
          error: `User has not consented to ${consentType}`,
          consentRequired: consentType,
          message: `Please enable ${consentType} consent in account settings to use this feature`
        });
      }

      // Store consent info in request for logging
      req.userConsent = {
        type: consentType,
        granted: true
      };

      next();
    } catch (error) {
      console.error('[CONSENT-CHECK] Error verifying consent:', error);
      return res.status(500).json({
        error: 'Failed to verify consent',
        details: error.message
      });
    }
  };
}

/**
 * Middleware: Check if user has provided ANY consent
 * Used as gate before accessing personalized features
 */
export async function checkConsentExists(req, res, next) {
  try {
    const userId = req.user?.uid || req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await db.query(
      'SELECT id FROM user_consents WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Consent required',
        message: 'Please complete consent setup before accessing this feature'
      });
    }

    next();
  } catch (error) {
    console.error('[CONSENT-CHECK] Error checking consent existence:', error);
    return res.status(500).json({ error: 'Failed to check consent' });
  }
}
