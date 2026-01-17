/**
 * Device Parser
 * Extracts device information from request headers
 */

import { UAParser } from 'ua-parser-js';

/**
 * Parse device information from Express request
 * @param {Object} req - Express request object
 * @returns {Object} Parsed device information
 */
export function parseDeviceInfo(req) {
  const parser = new UAParser(req.get('user-agent') || '');
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
  // Use req.ip - Express handles proxy headers correctly
  let ip = req.ip || 'localhost';
  
  // Normalize IPv6 to IPv4 if mapped
  if (ip.includes('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  
  // Normalize IPv6 loopback to localhost
  if (ip === '::1') {
    ip = 'localhost';
  }
  
  // Remove any whitespace
  return ip.trim().toLowerCase();
}


