/**
 * Security Metrics and Scoring
 * Dashboard metrics and IP reputation scoring
 */

import { THRESHOLDS } from './config.js';
import * as queries from './queries.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Get security dashboard metrics
 * Returns comprehensive overview of security status
 */
export async function getSecurityMetrics() {
  try {
    const [
      failedLoginsLast24h,
      suspiciousIPs,
      blockedAccounts,
      enumerationAttempts
    ] = await Promise.all([
      queries.getFailedLoginsLast24h(),
      queries.getSuspiciousIPs(THRESHOLDS.FAILED_LOGINS),
      queries.getLockedAccountsCount(),
      queries.getEnumerationAttempts(THRESHOLDS.ACCOUNT_ENUMERATION)
    ]);

    return {
      failedLoginsLast24h,
      suspiciousIPs,
      blockedAccounts,
      enumerationAttempts
    };
  } catch (error) {
    logErrorFromCatch(error, 'intrusion-detection', 'getSecurityMetrics');
    return null;
  }
}

/**
 * Get security score for IP address
 * Returns 0-100 score (100 = very suspicious)
 * 
 * Scoring Algorithm:
 * - Failed logins: +2 points each (max 40 points)
 * - Multiple accounts attempted: +3 points each (max 30 points)
 * - Successful login history: -20 points (reduces suspicion)
 * - Geographic anomalies: +30 points (future feature)
 */
export async function getIPSecurityScore(ipAddress) {
  try {
    let score = 0;

    // Check failed logins in last hour (2 points each, max 40)
    const failedCount = await queries.countFailedLoginsFromIP(ipAddress, 60);
    score += Math.min(40, failedCount * 2);

    // Check multiple accounts attempted (3 points each, max 30)
    const accountsCount = await queries.countAccountsAttemptedFromIP(ipAddress, 60);
    score += Math.min(30, accountsCount * 3);

    // Check if IP has successful login history (reduces score by 20)
    const hasSuccess = await queries.hasSuccessfulLogin(ipAddress, 7);
    if (hasSuccess) {
      score -= 20;
    }

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  } catch (error) {
    logErrorFromCatch(error, 'intrusion-detection', 'getIPSecurityScore');
    return 0;
  }
}

/**
 * Get severity level based on score
 * @param {number} score - Security score (0-100)
 * @returns {string} Severity level
 */
export function getScoreSeverity(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export default {
  getSecurityMetrics,
  getIPSecurityScore,
  getScoreSeverity
};
