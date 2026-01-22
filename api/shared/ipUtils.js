/**
 * IP Address Utilities
 * Handles IP extraction and validation
 */

/**
 * Extract client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
export function extractClientIp(req) {
  return (
    req.headers['x-client-ip'] || 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'Unknown'
  );
}

/**
 * Validate IP address format (IPv4 and IPv6)
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP address
 */
export function isValidIpAddress(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // IPv4 regex pattern
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex pattern (basic - covers most common cases)
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,6}:$|^(?:[0-9a-fA-F]{1,4}:){1}(?::[0-9a-fA-F]{1,4}){1,6}$/;
  
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * Sanitize description text
 * @param {string} description - Description text
 * @returns {string} Sanitized description
 */
export function sanitizeDescription(description) {
  if (!description || typeof description !== 'string') {
    return '';
  }
  
  // Remove HTML tags and limit length
  return description
    .replace(/<[^>]*>/g, '')
    .trim()
    .substring(0, 255);
}

export default {
  extractClientIp,
  isValidIpAddress,
  sanitizeDescription
};
