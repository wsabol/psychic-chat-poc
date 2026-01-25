/**
 * Request Metadata Middleware
 * Extracts common request metadata (IP, user agent, timestamp)
 */

/**
 * Extract request metadata for consent tracking
 * @param {Object} req - Express request object
 * @returns {Object} Metadata object
 */
export function extractRequestMetadata(req) {
  return {
    clientIp: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || '',
    timestamp: new Date().toISOString(),
    httpMethod: req.method,
    endpoint: req.path
  };
}

/**
 * Middleware to attach metadata to request object
 */
export function attachMetadata(req, res, next) {
  req.metadata = extractRequestMetadata(req);
  next();
}
