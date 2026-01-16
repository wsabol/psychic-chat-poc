/**
 * Fraud Detection Service
 * Analyzes login patterns for suspicious activity
 */

import {
  countFailedAttemptsFromIp,
  countUniqueUsersFromIp,
  getAttemptsFromIp
} from './loginAttemptService.js';
import { logErrorFromCatch } from '../../errorLogger.js';

// Thresholds for suspicious activity
const THRESHOLDS = {
  FAILED_ATTEMPTS: 5,      // More than 5 failed attempts
  UNIQUE_USERS: 3,         // More than 3 different users
  BRUTE_FORCE_WINDOW: 60,  // Within 60 minutes
  DISTRIBUTED_ATTACK: 10   // 10+ different IPs for same user
};

/**
 * Detect suspicious login patterns for an IP
 * @param {string} ipAddress - IP to analyze
 * @param {number} minutes - Time window to analyze
 * @returns {Promise<Object>} Suspicious activity analysis
 */
export async function detectSuspiciousIP(ipAddress, minutes = 60) {
  try {
    const failedCount = await countFailedAttemptsFromIp(ipAddress, minutes);
    const uniqueUsers = await countUniqueUsersFromIp(ipAddress, minutes);

    let suspiciousScore = 0;
    let indicators = [];
    let riskLevel = 'low';

    // Check for brute force attempts
    if (failedCount > THRESHOLDS.FAILED_ATTEMPTS) {
      suspiciousScore += failedCount * 2;
      indicators.push(`${failedCount} failed login attempts (threshold: ${THRESHOLDS.FAILED_ATTEMPTS})`);
    }

    // Check for distributed attack (multiple users from same IP)
    if (uniqueUsers > THRESHOLDS.UNIQUE_USERS) {
      suspiciousScore += uniqueUsers * 5;
      indicators.push(`${uniqueUsers} different user accounts attempted (threshold: ${THRESHOLDS.UNIQUE_USERS})`);
    }

    // Determine risk level
    if (suspiciousScore > 50) {
      riskLevel = 'critical';
    } else if (suspiciousScore > 20) {
      riskLevel = 'high';
    } else if (suspiciousScore > 5) {
      riskLevel = 'medium';
    }

    return {
      ipAddress,
      suspiciousScore,
      riskLevel,
      isSuspicious: suspiciousScore > 10,
      indicators,
      failedAttempts: failedCount,
      uniqueUsers,
      recommendations: getSuspiciousIPRecommendations(riskLevel)
    };

    } catch (error) {
    logErrorFromCatch(error, 'fraud-detection', 'detect suspicious IP');
    return {
      ipAddress,
      suspiciousScore: 0,
      riskLevel: 'unknown',
      isSuspicious: false,
      indicators: ['Error analyzing IP'],
      failedAttempts: 0,
      uniqueUsers: 0,
      recommendations: []
    };
  }
}

/**
 * Detect suspicious patterns for a specific user
 * @param {string} userId - User ID to analyze
 * @param {number} hours - Time window to analyze
 * @returns {Promise<Object>} User-specific suspicious analysis
 */
export async function detectSuspiciousUserActivity(userId, hours = 24) {
  try {
    // This would need additional implementation for user-specific analysis
    // For now, return basic structure
    return {
      userId,
      suspiciousScore: 0,
      riskLevel: 'low',
      isSuspicious: false,
      indicators: [],
      recommendations: []
    };

    } catch (error) {
    logErrorFromCatch(error, 'fraud-detection', 'detect suspicious user activity');
    return {
      userId,
      suspiciousScore: 0,
      riskLevel: 'unknown',
      isSuspicious: false,
      indicators: ['Error analyzing user'],
      recommendations: []
    };
  }
}

/**
 * Should we challenge this login attempt?
 * (Requires additional verification like 2FA)
 * @param {Object} loginContext - Context of login attempt
 * @returns {boolean}
 */
export function shouldChallenge(loginContext) {
  const {
    suspiciousScore = 0,
    riskLevel = 'low',
    isNewDevice = false,
    isNewLocation = false
  } = loginContext;

  // Challenge if:
  // 1. Suspicious activity detected
  if (suspiciousScore > 10) return true;

  // 2. High risk level
  if (riskLevel === 'high' || riskLevel === 'critical') return true;

  // 3. New device detected
  if (isNewDevice) return true;

  // 4. New location (geographically impossible login)
  if (isNewLocation) return true;

  return false;
}

/**
 * Get recommendations based on risk level
 * @private
 */
function getSuspiciousIPRecommendations(riskLevel) {
  const recommendations = {
    low: ['Monitor for patterns'],
    medium: [
      'Require CAPTCHA verification',
      'Monitor account activity',
      'Alert user of unusual attempts'
    ],
    high: [
      'Block further attempts temporarily',
      'Require additional verification (2FA)',
      'Notify user immediately',
      'Consider IP blocking'
    ],
    critical: [
      'Block IP immediately',
      'Require 2FA + CAPTCHA',
      'Alert security team',
      'Invalidate all existing sessions',
      'Investigate account compromise'
    ]
  };

  return recommendations[riskLevel] || recommendations.low;
}

export default {
  detectSuspiciousIP,
  detectSuspiciousUserActivity,
  shouldChallenge
};
