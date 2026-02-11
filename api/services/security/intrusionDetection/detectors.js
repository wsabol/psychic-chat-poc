/**
 * Threat Detection Functions
 * Specific detection logic for various attack patterns
 */

import { THRESHOLDS, SEVERITY } from './config.js';
import * as queries from './queries.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

/**
 * Detect brute force attacks
 * Multiple failed login attempts from same IP
 */
export async function checkBruteForce(ipAddress) {
  try {
    const failedCount = await queries.countFailedLoginsFromIP(
      ipAddress,
      THRESHOLDS.FAILED_LOGINS_WINDOW
    );

    if (failedCount >= THRESHOLDS.FAILED_LOGINS) {
      return {
        detected: true,
        type: 'BRUTE_FORCE_ATTACK',
        severity: failedCount > 20 ? SEVERITY.CRITICAL : SEVERITY.HIGH,
        ipAddress,
        details: {
          failedAttempts: failedCount,
          timeWindow: `${THRESHOLDS.FAILED_LOGINS_WINDOW} minutes`
        },
        recommendation: `Block IP ${ipAddress} from login for 24 hours`
      };
    }

    return { detected: false };
  } catch (error) {
    logErrorFromCatch(error, 'intrusion-detection', 'checkBruteForce');
    return { detected: false };
  }
}

/**
 * Detect account enumeration attacks
 * Testing multiple accounts from single IP
 */
export async function checkAccountEnumeration(ipAddress) {
  try {
    const uniqueAccounts = await queries.countAccountsAttemptedFromIP(
      ipAddress,
      THRESHOLDS.ENUMERATION_WINDOW
    );

    if (uniqueAccounts >= THRESHOLDS.ACCOUNT_ENUMERATION) {
      return {
        detected: true,
        type: 'ACCOUNT_ENUMERATION',
        severity: SEVERITY.HIGH,
        ipAddress,
        details: {
          uniqueAccounts,
          timeWindow: `${THRESHOLDS.ENUMERATION_WINDOW} minutes`
        },
        recommendation: `Investigate ${ipAddress} for account enumeration attack`
      };
    }

    return { detected: false };
  } catch (error) {
    logErrorFromCatch(error, 'intrusion-detection', 'checkAccountEnumeration');
    return { detected: false };
  }
}

/**
 * Detect rapid request patterns
 * Too many requests from single IP (DoS/brute force)
 */
export async function checkRapidRequests(ipAddress) {
  try {
    const requestCount = await queries.countRequestsFromIP(ipAddress, 1); // 1 minute window

    if (requestCount > THRESHOLDS.RAPID_REQUESTS) {
      return {
        detected: true,
        type: 'RAPID_REQUEST_PATTERN',
        severity: SEVERITY.MEDIUM,
        ipAddress,
        details: {
          requestsPerMinute: requestCount,
          threshold: THRESHOLDS.RAPID_REQUESTS
        },
        recommendation: `Rate limit IP ${ipAddress} to 10 requests/minute`
      };
    }

    return { detected: false };
  } catch (error) {
    logErrorFromCatch(error, 'intrusion-detection', 'checkRapidRequests');
    return { detected: false };
  }
}

/**
 * Detect geographic anomalies
 * Login from new country/region
 * 
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address
 * @returns {Promise<Object>} Detection result
 */
export async function checkGeographicAnomaly(userId, ipAddress) {
  // This requires a GeoIP database (MaxMind GeoIP2 or similar)
  // Not implemented in current version
  return { detected: false };
}

/**
 * Detect unusual data export patterns
 * Large data exports that might indicate exfiltration
 */
export async function checkDataExport(userId, dataSize) {
  try {
    if (!dataSize) return { detected: false };

    const dataSizeMB = dataSize / (1024 * 1024);

    if (dataSizeMB > THRESHOLDS.DATA_EXPORT_SIZE) {
      return {
        detected: true,
        type: 'LARGE_DATA_EXPORT',
        severity: SEVERITY.MEDIUM,
        userId,
        details: {
          exportSizeMB: dataSizeMB.toFixed(2),
          threshold: `${THRESHOLDS.DATA_EXPORT_SIZE}MB`
        },
        recommendation: `Review data export by user ${userId}`
      };
    }

    return { detected: false };
  } catch (error) {
    logErrorFromCatch(error, 'intrusion-detection', 'checkDataExport');
    return { detected: false };
  }
}

export default {
  checkBruteForce,
  checkAccountEnumeration,
  checkRapidRequests,
  checkGeographicAnomaly,
  checkDataExport
};
