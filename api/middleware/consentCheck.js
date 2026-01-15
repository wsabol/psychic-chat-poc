/**
 * Consent Verification Middleware
 * Checks if user has required consent before allowing specific actions
 */

import { db } from '../shared/db.js';
import { authError, validationError, forbiddenError, serverError } from '../utils/responses.js';

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
        return authError(res, 'User not authenticated');
      }

      // Map consent type to column name
      const consentColumnMap = {
        'astrology': 'consent_astrology',
        'health_data': 'consent_health_data',
        'chat_analysis': 'consent_chat_analysis'
      };

            const columnName = consentColumnMap[consentType];
      if (!columnName) {
        return validationError(res, 'Invalid consent type');
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
        return forbiddenError(res, `User has not consented to ${consentType}`);
      }

      // Store consent info in request for logging
      req.userConsent = {
        type: consentType,
        granted: true
      };

      next();
        } catch (error) {
      return serverError(res, 'Failed to verify consent');
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
      return authError(res, 'User not authenticated');
    }

    const result = await db.query(
      'SELECT id FROM user_consents WHERE user_id = $1',
      [userId]
    );

        if (result.rows.length === 0) {
      return forbiddenError(res, 'Consent required');
    }

    next();
    } catch (error) {
    return serverError(res, 'Failed to check consent');
  }
}
