/**
 * Standardized Response Utilities for Production
 */

export const ErrorCodes = {
  // Auth errors
  AUTH_REQUIRED: 'AUTH_REQUIRED_401',
  AUTH_FAILED: 'AUTH_FAILED_401',
  INVALID_TOKEN: 'INVALID_TOKEN_401',
  
  // Validation errors
  MISSING_PARAM: 'MISSING_PARAM_400',
  INVALID_INPUT: 'INVALID_INPUT_400',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND_404',
  GENERATING: 'GENERATING_202',
  PROCESSING: 'PROCESSING_202',
  
  // Server errors
  SERVER_ERROR: 'SERVER_ERROR_500',
  DATABASE_ERROR: 'DATABASE_ERROR_500'
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
