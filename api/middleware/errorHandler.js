/**
 * Safe Error Handler Middleware
 * 
 * Ensures errors don't leak sensitive information:
 * - Database errors (don't reveal schema)
 * - Stack traces (only in development)
 * - File paths (don't reveal system structure)
 * - User existence (don't confirm/deny user exists)
 */

/**
 * Safe error response
 * Returns generic error to client, logs details internally
 */
export function SafeError(message, statusCode = 500, details = {}) {
  this.message = message;
  this.statusCode = statusCode;
  this.details = details;  // For internal logging only
  this.isOperational = true;  // Error we can handle gracefully
}

/**
 * Error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Log full error details internally
  logErrorDetails(err, req);

  // Don't expose internal error details to client
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Prepare response
  const response = {
    error: getGenericErrorMessage(statusCode)
  };

  // In development, include error details
  if (!isProduction && err.details) {
    response.details = err.details;
  }

  // In development, include stack trace (NEVER in production)
  if (!isProduction && err.stack) {
    response.stack = err.stack.split('\n');
  }

  // Add error ID for support reference
  response.errorId = generateErrorId();

  res.status(statusCode).json(response);
}

/**
 * Get generic error message based on status code
 * Never reveals specific technical details
 */
function getGenericErrorMessage(statusCode) {
  const messages = {
    400: 'Invalid request',
    401: 'Authentication required',
    403: 'Access denied',
    404: 'Resource not found',
    409: 'Conflict',
    429: 'Too many requests',
    413: 'Payload too large',
    500: 'Internal server error',
    502: 'Service unavailable',
    503: 'Service unavailable'
  };

  return messages[statusCode] || 'An error occurred';
}

/**
 * Log error details (internal use only)
 */
function logErrorDetails(err, req) {
  const details = {
    message: err.message,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };

  // Only include stack trace in logs, not responses
  if (err.stack) {
    details.stack = err.stack;
  }

  // Log database errors without exposing schema
  if (err.code === 'PROTOCOL_ERROR' || err.code === '42P01') {
    details.databaseError = true;
    details.errorCode = err.code;
    // Don't include the full SQL query or field names
  }

  console.error('[ERROR]', JSON.stringify(details, null, 2));
}

/**
 * Specific error handlers (prevent information leakage)
 */

/**
 * Handle database errors safely
 */
export function handleDatabaseError(error) {
  const isProduction = process.env.NODE_ENV === 'production';

  // User-friendly errors
  if (error.code === '23505') {  // Unique constraint violation
    return {
      statusCode: 409,
      message: 'Invalid request',
      details: isProduction ? {} : { constraint: error.constraint }
    };
  }

  if (error.code === '23502') {  // Not null violation
    return {
      statusCode: 400,
      message: 'Invalid request',
      details: isProduction ? {} : { column: error.column }
    };
  }

  if (error.code === '42P01') {  // Table doesn't exist
    return {
      statusCode: 500,
      message: 'Internal server error',
      details: isProduction ? {} : { table: error.table }
    };
  }

  // Generic database error
  return {
    statusCode: 500,
    message: 'Database error',
    details: isProduction ? {} : { code: error.code }
  };
}

/**
 * Handle authentication errors safely
 * Don't confirm whether email exists
 */
export function handleAuthError(error, email) {
  // Always return the same message (don't leak user existence)
  return {
    statusCode: 401,
    message: 'Invalid email or password',
    details: {}
  };
}

/**
 * Handle validation errors
 */
export function handleValidationError(errors) {
  // Include validation errors (client can fix them)
  return {
    statusCode: 400,
    message: 'Validation failed',
    errors: errors
  };
}

/**
 * Handle file system errors
 */
export function handleFileError(error) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (error.code === 'ENOENT') {
    return {
      statusCode: 404,
      message: 'File not found',
      details: isProduction ? {} : { filename: error.path }
    };
  }

  if (error.code === 'EACCES') {
    return {
      statusCode: 403,
      message: 'Access denied',
      details: isProduction ? {} : { filename: error.path }
    };
  }

  return {
    statusCode: 500,
    message: 'File system error',
    details: isProduction ? {} : { code: error.code }
  };
}

/**
 * Generate unique error ID for support reference
 */
function generateErrorId() {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

/**
 * Async error handler wrapper
 * Catches errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate request and return safe error
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Check required fields
      if (rules.required && !value) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      // Check field types
      if (value && rules.type) {
        if (typeof value !== rules.type) {
          errors.push({ field, message: `${field} must be ${rules.type}` });
        }
      }

      // Check patterns
      if (value && rules.pattern && !rules.pattern.test(value)) {
        errors.push({ field, message: `${field} format is invalid` });
      }
    }

    if (errors.length > 0) {
       return authError(
        res, 'Validation failed'
       );
    }

    next();
  };
}

/**
 * Log security events (suspicious activity)
 */
export async function logSecurityEvent(type, details, req) {
  try {

    // Could send to security monitoring service
    // await sendToSecurityMonitoring(type, details);
  } catch (error) {
    console.error('[SECURITY] Failed to log security event:', error);
  }
}

export default {
  SafeError,
  errorHandler,
  handleDatabaseError,
  handleAuthError,
  handleValidationError,
  handleFileError,
  asyncHandler,
  validateRequest,
  logSecurityEvent
};

