/**
 * Device Parser
 * Extracts device information from request headers
 */

import UAParser from 'ua-parser-js';

/**
 * Parse device information from Express request
 * @param {Object} req - Express request object
 * @returns {Object} Parsed device information
 */
export function parseDeviceInfo(req) {
  const parser = new UAParser(req.get('user-agent'));
  const result = parser.getResult();

  return {
    deviceName: formatDeviceName(result),
    deviceType: result.device.type || 'desktop',
    browserName: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    osName: result.os.name || 'Unknown',
    osVersion: result.os.version || 'Unknown',
    userAgent: req.get('user-agent'),
    ipAddress: extractIpAddress(req)
  };
}

/**
 * Format device name from UA parser result
 * @param {Object} result - UA parser result
 * @returns {string} Formatted device name
 */
function formatDeviceName(result) {
  const browser = result.browser.name || 'Unknown';
  const os = result.os.name || 'Unknown';
  return `${browser} on ${os}`;
}

/**
 * Extract client IP address from request
 * Handles proxies (X-Forwarded-For, X-Real-IP)
 * @param {Object} req - Express request
 * @returns {string} IP address
 */
function extractIpAddress(req) {
  // Check for IP in order of preference
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

export default {
  parseDeviceInfo,
  extractIpAddress
};
