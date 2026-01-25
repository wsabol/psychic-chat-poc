/**
 * Consent Validators
 * Input validation for consent endpoints
 */

import { validationError } from '../../utils/responses.js';

/**
 * Validate userId parameter
 */
export function validateUserId(req, res, next) {
  const userId = req.params.userId || req.body.userId;
  
  if (!userId) {
    return validationError(res, 'userId required');
  }
  
  // Store validated userId in req for consistency
  req.validatedUserId = userId;
  next();
}

/**
 * Validate consent recording request
 */
export function validateConsentRequest(req, res, next) {
  const userId = req.params.userId || req.body.userId;
  
  if (!userId) {
    return validationError(res, 'userId required');
  }
  
  // Validate consent flags are boolean-like
  const { terms_accepted, privacy_accepted, consent_astrology, consent_health_data, consent_chat_analysis } = req.body;
  
  // At least one consent field should be present
  const hasConsentFields = 
    terms_accepted !== undefined || 
    privacy_accepted !== undefined || 
    consent_astrology !== undefined || 
    consent_health_data !== undefined || 
    consent_chat_analysis !== undefined;
  
  if (!hasConsentFields) {
    return validationError(res, 'At least one consent field required');
  }
  
  req.validatedUserId = userId;
  next();
}

/**
 * Validate consent type parameter
 */
export function validateConsentType(req, res, next) {
  const { consentType } = req.params;
  const validTypes = ['astrology', 'health_data', 'chat_analysis'];
  
  if (!consentType) {
    return validationError(res, 'consentType required');
  }
  
  if (!validTypes.includes(consentType)) {
    return validationError(res, `Invalid consentType. Must be: ${validTypes.join(', ')}`);
  }
  
  next();
}

/**
 * Validate document type for flagging users
 */
export function validateDocumentType(req, res, next) {
  const { documentType } = req.body;
  const validTypes = ['terms', 'privacy', 'both'];
  
  if (documentType && !validTypes.includes(documentType)) {
    return validationError(res, `Invalid documentType. Must be: ${validTypes.join(', ')}`);
  }
  
  next();
}

export default {
  validateUserId,
  validateConsentRequest,
  validateConsentType,
  validateDocumentType
};
