/**
 * Standardized Response Utilities for Production
 */

export const ErrorCodes = {
  // Auth errors (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED_401',
  AUTH_FAILED: 'AUTH_FAILED_401',
  INVALID_TOKEN: 'INVALID_TOKEN_401',
  UNAUTHORIZED: 'UNAUTHORIZED_401',
  
  // Validation errors (400)
  MISSING_PARAM: 'MISSING_PARAM_400',
  INVALID_INPUT: 'INVALID_INPUT_400',
  INVALID_DATA: 'INVALID_DATA_400',
  
  // Permission errors (403)
  FORBIDDEN: 'FORBIDDEN_403',
  PERMISSION_DENIED: 'PERMISSION_DENIED_403',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT_409',
  DUPLICATE: 'DUPLICATE_409',
  ALREADY_EXISTS: 'ALREADY_EXISTS_409',
  
  // Resource errors (404, 202)
  NOT_FOUND: 'NOT_FOUND_404',
  GENERATING: 'GENERATING_202',
  PROCESSING: 'PROCESSING_202',
  
  // Business logic errors (422)
  UNPROCESSABLE: 'UNPROCESSABLE_422',
  INVALID_STATE: 'INVALID_STATE_422',
  
  // Server errors (500)
  SERVER_ERROR: 'SERVER_ERROR_500',
  DATABASE_ERROR: 'DATABASE_ERROR_500',
  PAYMENT_ERROR: 'PAYMENT_ERROR_500',
  BILLING_ERROR: 'BILLING_ERROR_500'
};

// Validation Error (400)
export function validationError(res, message, errorCode = ErrorCodes.MISSING_PARAM) {
  return res.status(400).json({
    error: message,
    errorCode
  });
}

// Authorization Error (401)
export function authError(res, message = 'Authentication required', errorCode = ErrorCodes.AUTH_REQUIRED) {
  return res.status(401).json({
    error: message,
    errorCode
  });
}

// Not Found (404)
export function notFoundError(res, message = 'Resource not found') {
  return res.status(404).json({
    error: message,
    errorCode: ErrorCodes.NOT_FOUND
  });
}

// Processing/Generating (202)
export function processingResponse(res, message, status = 'generating') {
  return res.status(202).json({
    status,
    message
  });
}

// Server Error (500)
export function serverError(res, message = 'An error occurred') {
  return res.status(500).json({
    error: message,
    errorCode: ErrorCodes.SERVER_ERROR
  });
}

// Success (200)
export function successResponse(res, data) {
  return res.status(200).json(data);
}

// Created (201)
export function createdResponse(res, data) {
  return res.status(201).json(data);
}

// Forbidden/Permission Denied (403)
export function forbiddenError(res, message = 'Forbidden', errorCode = ErrorCodes.FORBIDDEN) {
  return res.status(403).json({
    error: message,
    errorCode
  });
}

// Conflict (409) - Duplicate, already exists, etc.
export function conflictError(res, message = 'Resource already exists', errorCode = ErrorCodes.CONFLICT) {
  return res.status(409).json({
    error: message,
    errorCode
  });
}

// Unprocessable Entity (422) - Invalid state for operation
export function unprocessableError(res, message = 'Cannot process request', errorCode = ErrorCodes.UNPROCESSABLE) {
  return res.status(422).json({
    error: message,
    errorCode
  });
}

// Billing Error (500)
export function billingError(res, message = 'Billing operation failed', errorCode = ErrorCodes.BILLING_ERROR) {
  return res.status(500).json({
    error: message,
    errorCode
  });
}

// Database Error (500)
export function databaseError(res, message = 'Database operation failed', errorCode = ErrorCodes.DATABASE_ERROR) {
  return res.status(500).json({
    error: message,
    errorCode
  });
}

// Health Content Blocked (400) - Special case for guardrail blocks
export function healthContentBlockedError(res, message = 'Request contains health content that cannot be processed') {
  return res.status(400).json({
    success: false,
    error: message,
    reason: 'health_content_blocked',
    timestamp: new Date().toISOString()
  });
}
