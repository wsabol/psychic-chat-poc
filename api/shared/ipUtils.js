/**
 * IP Address Utilities
 * Handles IP extraction and validation
 */

/**
 * Extract client IP address from request.
 * Checks headers set by proxies/load-balancers first, then falls back to the
 * raw socket address. IPv6 localhost variants are normalised to '127.0.0.1'.
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
export function extractClientIp(req) {
  const ip =
    req.headers['x-client-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1'; // Fallback for local development

  // Normalise IPv6 localhost representations
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }

  // Strip IPv4-mapped IPv6 prefix (e.g. "::ffff:203.0.113.5" → "203.0.113.5")
  // This matches the normalizeIP() behaviour in services/security/adminIpTrustService.js
  // so that IPs are always in plain IPv4 (or pure IPv6) form before validation / hashing.
  const ipv4MappedMatch = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (ipv4MappedMatch) {
    return ipv4MappedMatch[1];
  }

  return ip;
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
