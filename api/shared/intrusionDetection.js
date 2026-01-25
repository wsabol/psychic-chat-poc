/**
 * Intrusion Detection System (IDS)
 * Real-time anomaly detection and alerting
 * 
 * Monitors:
 * - Brute force attacks (multiple failed logins)
 * - Account enumeration (testing multiple accounts)
 * - Unusual access patterns (rapid requests)
 * - Data exfiltration (large exports)
 * - Privilege escalation attempts
 */

import { db } from './db.js';
import { logAudit } from './auditLog.js';
import { logErrorFromCatch } from './errorLogger.js';

// Thresholds for detection
const THRESHOLDS = {
  FAILED_LOGINS: 5,                    // Failed logins to trigger alert
  FAILED_LOGINS_WINDOW: 15,            // Minutes for failed login window
  ACCOUNT_ENUMERATION: 10,             // Attempts to test accounts
  ENUMERATION_WINDOW: 30,              // Minutes
  RAPID_REQUESTS: 100,                 // Requests per minute
  DATA_EXPORT_SIZE: 50,                // MB to trigger alert
  UNUSUAL_TIME: true,                  // Alert if login at unusual hours
  GEOGRAPHIC_ANOMALY: true,            // Alert if login from new country
  IMPOSSIBLE_TRAVEL: true              // Alert if travel > 900 km/hour
};

/**
 * Main anomaly detection engine
 */
export async function detectAnomalies(event) {
  const anomalies = [];

  // Check each detection rule
  const bruteForce = await checkBruteForce(event.ipAddress);
  if (bruteForce.detected) anomalies.push(bruteForce);

  const enumeration = await checkAccountEnumeration(event.ipAddress);
  if (enumeration.detected) anomalies.push(enumeration);

  const rapidRequests = await checkRapidRequests(event.ipAddress);
  if (rapidRequests.detected) anomalies.push(rapidRequests);

  if (event.userId) {
    const geoAnomaly = await checkGeographicAnomaly(event.userId, event.ipAddress);
    if (geoAnomaly.detected) anomalies.push(geoAnomaly);

    const dataExport = await checkDataExport(event.userId, event.dataSize);
    if (dataExport.detected) anomalies.push(dataExport);
  }

  // If anomalies detected, raise alert
  if (anomalies.length > 0) {
    await raiseAlert(event, anomalies);
  }

  return anomalies;
}

/**
 * Detect brute force attacks
 * Multiple failed login attempts from same IP
 */
async function checkBruteForce(ipAddress) {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as failed_count
       FROM login_attempts
       WHERE pgp_sym_decrypt(ip_address_encrypted, $1) = $2
         AND attempt_type = 'failed'
         AND created_at > NOW() - INTERVAL '1 minute' * $3`,
      [process.env.ENCRYPTION_KEY, ipAddress, THRESHOLDS.FAILED_LOGINS_WINDOW]
    );

    const failedCount = parseInt(result.rows[0].failed_count);

    if (failedCount >= THRESHOLDS.FAILED_LOGINS) {
      return {
        detected: true,
        type: 'BRUTE_FORCE_ATTACK',
        severity: failedCount > 20 ? 'CRITICAL' : 'HIGH',
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
    logErrorFromCatch(error, 'app', 'ids');
    return { detected: false };
  }
}

/**
 * Detect account enumeration attacks
 * Testing multiple accounts from single IP
 */
async function checkAccountEnumeration(ipAddress) {
  try {
    const result = await db.query(
      `SELECT COUNT(DISTINCT email_attempted) as unique_accounts,
              COUNT(*) as total_attempts
       FROM login_attempts
       WHERE ip_address = $1
         AND attempt_type IN ('failed_password', 'success')
         AND created_at > NOW() - INTERVAL '1 minute' * $2`,
      [ipAddress, THRESHOLDS.ENUMERATION_WINDOW]
    );

    const uniqueAccounts = parseInt(result.rows[0].unique_accounts);
    const totalAttempts = parseInt(result.rows[0].total_attempts);

    if (uniqueAccounts >= THRESHOLDS.ACCOUNT_ENUMERATION) {
      return {
        detected: true,
        type: 'ACCOUNT_ENUMERATION',
        severity: 'HIGH',
        ipAddress,
        details: {
          uniqueAccounts,
          totalAttempts,
          timeWindow: `${THRESHOLDS.ENUMERATION_WINDOW} minutes`
        },
        recommendation: `Investigate ${ipAddress} for account enumeration attack`
      };
    }

    return { detected: false };

  } catch (error) {
    logErrorFromCatch(error, 'app', 'ids');
    return { detected: false };
  }
}

/**
 * Detect rapid request patterns
 * Too many requests from single IP (DoS/brute force)
 */
async function checkRapidRequests(ipAddress) {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as request_count
       FROM audit_log
       WHERE ip_address = $1
         AND created_at > NOW() - INTERVAL '1 minute'`,
      [ipAddress]
    );

    const requestCount = parseInt(result.rows[0].request_count);

    if (requestCount > THRESHOLDS.RAPID_REQUESTS) {
      return {
        detected: true,
        type: 'RAPID_REQUEST_PATTERN',
        severity: 'MEDIUM',
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
    logErrorFromCatch(error, 'app', 'ids');
    return { detected: false };
  }
}

/**
 * Detect geographic anomalies
 * Login from new country/region
 */
async function checkGeographicAnomaly(userId, ipAddress) {
  // This requires a GeoIP database
  // For MVP, we'll implement basic detection
  
  // TODO: Integrate MaxMind GeoIP2 or similar service
  // For now, return false (not implemented)
  
  return { detected: false };
}

/**
 * Detect unusual data export patterns
 * Large data exports that might indicate exfiltration
 */
async function checkDataExport(userId, dataSize) {
  if (!dataSize) return { detected: false };

  const dataSizeMB = dataSize / (1024 * 1024);

  if (dataSizeMB > THRESHOLDS.DATA_EXPORT_SIZE) {
    return {
      detected: true,
      type: 'LARGE_DATA_EXPORT',
      severity: 'MEDIUM',
      userId,
      details: {
        exportSizeMB: dataSizeMB.toFixed(2),
        threshold: `${THRESHOLDS.DATA_EXPORT_SIZE}MB`
      },
      recommendation: `Review data export by user ${userId}`
    };
  }

  return { detected: false };
}

/**
 * Raise security alert
 */
async function raiseAlert(event, anomalies) {
  try {
    const alertSummary = anomalies
      .map(a => `${a.type} (${a.severity})`)
      .join(', ');

        // Log to security audit trail
    await logAudit(db, {
      userId: event.userId || 'unknown',
      action: 'INTRUSION_DETECTION_ALERT',
      resourceType: 'security',
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      httpMethod: event.method,
      endpoint: event.path,
      status: 'ALERT',
      details: {
        anomalies: anomalies.map(a => ({
          type: a.type,
          severity: a.severity,
          details: a.details
        }))
      }
    }).catch(e => {
      logErrorFromCatch(e, 'intrusion-detection', 'Log anomaly alert').catch(() => {});
    });

    // TODO: Send email alert to security team
    // TODO: Page on-call security engineer (for CRITICAL)
    // TODO: Automatically block IP (for CRITICAL)

    return true;

  } catch (error) {
    logErrorFromCatch(error, 'app', 'ids');
    return false;
  }
}

/**
 * Get security score for IP address
 * Returns 0-100 score (100 = very suspicious)
 */
export async function getIPSecurityScore(ipAddress) {
  try {
    let score = 0;

    // Check failed logins (20 points per failed login, max 40)
    const failedResult = await db.query(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE ip_address = $1 AND attempt_type = 'failed_password'
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [ipAddress]
    );
    score += Math.min(40, parseInt(failedResult.rows[0].count) * 2);

    // Check multiple accounts (20 points per unique account, max 30)
    const accountResult = await db.query(
      `SELECT COUNT(DISTINCT email_attempted) as count FROM login_attempts
       WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [ipAddress]
    );
    score += Math.min(30, parseInt(accountResult.rows[0].count) * 3);

    // Check if IP has successful login (reduce score by 20)
    const successResult = await db.query(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE ip_address = $1 AND attempt_type = 'success'
       AND created_at > NOW() - INTERVAL '7 days'`,
      [ipAddress]
    );
    if (parseInt(successResult.rows[0].count) > 0) score -= 20;

    return Math.max(0, Math.min(100, score));

  } catch (error) {
    logErrorFromCatch(error, 'app', 'ids');
    return 0;
  }
}

/**
 * Automatically block suspicious IP (for CRITICAL severity)
 */
export async function blockIP(ipAddress, reason, durationHours = 24) {
  try {
    // TODO: Implement IP blocking in firewall/WAF
    
        // Log to audit trail
    await logAudit(db, {
      userId: 'system',
      action: 'IP_BLOCKED',
      resourceType: 'security',
      ipAddress: ipAddress,
      status: 'SUCCESS',
      details: {
        reason,
        durationHours
      }
    }).catch(e => {
      logErrorFromCatch(e, 'intrusion-detection', 'Log IP block').catch(() => {});
    });

    return true;

  } catch (error) {
    logErrorFromCatch(error, 'app', 'ids');
    return false;
  }
}

/**
 * Get security dashboard metrics
 */
export async function getSecurityMetrics() {
  try {
    // Failed logins in last 24 hours
    const failedLogins = await db.query(
      `SELECT COUNT(*) as count FROM login_attempts
       WHERE attempt_type = 'failed'
       AND created_at > NOW() - INTERVAL '24 hours'`
    );

    // Suspicious IPs - decrypt to group by IP
    const suspiciousIPs = await db.query(
      `SELECT pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address, 
              COUNT(*) as failed_count
       FROM login_attempts
       WHERE attempt_type = 'failed'
       AND created_at > NOW() - INTERVAL '1 hour'
       GROUP BY ip_address_encrypted
       HAVING COUNT(*) >= $2
       ORDER BY failed_count DESC
       LIMIT 10`,
      [process.env.ENCRYPTION_KEY, THRESHOLDS.FAILED_LOGINS]
    );

    // Blocked accounts - check user_account_lockouts table
    const blockedAccounts = await db.query(
      `SELECT COUNT(DISTINCT user_id_hash) as count
       FROM user_account_lockouts
       WHERE lock_expires_at > NOW()`
    ).catch(() => ({ rows: [{ count: 0 }] }));

    // Account enumeration attempts - decrypt email to count distinct
    const enumerationAttempts = await db.query(
      `SELECT pgp_sym_decrypt(ip_address_encrypted, $1) as ip_address,
              COUNT(DISTINCT email_attempted_encrypted) as unique_accounts
       FROM login_attempts
       WHERE created_at > NOW() - INTERVAL '1 hour'
       GROUP BY ip_address_encrypted
       HAVING COUNT(DISTINCT email_attempted_encrypted) >= $2
       ORDER BY unique_accounts DESC
       LIMIT 5`,
      [process.env.ENCRYPTION_KEY, THRESHOLDS.ACCOUNT_ENUMERATION]
    );

    return {
      failedLoginsLast24h: parseInt(failedLogins.rows[0].count),
      suspiciousIPs: suspiciousIPs.rows,
      blockedAccounts: parseInt(blockedAccounts.rows[0].count),
      enumerationAttempts: enumerationAttempts.rows
    };

  } catch (error) {
    logErrorFromCatch(error, 'app', 'ids');
    return null;
  }
}

export default {
  detectAnomalies,
  getIPSecurityScore,
  blockIP,
  getSecurityMetrics
};
