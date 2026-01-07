/**
 * Violation Pattern Detection
 * Identifies patterns that may indicate systemic issues or account abuse
 * 
 * Pattern Types:
 * - RAPID_ESCALATION: Multiple violations in short time span
 * - SAME_TYPE_REPEAT: Repeated violations of same type
 * - ACCOUNT_ABUSE: Cycling through new accounts
 * - THRESHOLD_WARNING: Approaching penalty threshold
 * - FALSE_POSITIVE_CLUSTER: Multiple reported false positives
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

export const PATTERN_TYPES = {
  RAPID_ESCALATION: 'rapid_escalation',
  SAME_TYPE_REPEAT: 'same_type_repeat',
  THRESHOLD_WARNING: 'threshold_warning',
  FALSE_POSITIVE_CLUSTER: 'false_positive_cluster',
  LOW_CONFIDENCE_FLAGGING: 'low_confidence_flagging',
};

/**
 * Check for violation patterns on a user account
 * Should be called when new violation is recorded
 */
export async function detectPatterns(userId, violationType) {
  try {
    const userIdHash = hashUserId(userId);
    const patterns = [];

    // Check for rapid escalation (multiple violations in 24 hours)
    const rapidEscalation = await checkRapidEscalation(userIdHash);
    if (rapidEscalation) {
      patterns.push(rapidEscalation);
    }

    // Check for same-type repeats (3+ violations of same type in 7 days)
    const sameTypeRepeat = await checkSameTypeRepeat(userIdHash, violationType);
    if (sameTypeRepeat) {
      patterns.push(sameTypeRepeat);
    }

    // Check if approaching threshold for escalation
    const thresholdWarning = await checkThresholdWarning(userIdHash, violationType);
    if (thresholdWarning) {
      patterns.push(thresholdWarning);
    }

    // Check for false positive cluster
    const falsePositiveCluster = await checkFalsePositiveCluster(userIdHash);
    if (falsePositiveCluster) {
      patterns.push(falsePositiveCluster);
    }

    // Check for low confidence flagging pattern
    const lowConfidencePattern = await checkLowConfidencePattern(userIdHash);
    if (lowConfidencePattern) {
      patterns.push(lowConfidencePattern);
    }

    // Record patterns if found
    if (patterns.length > 0) {
      for (const pattern of patterns) {
        await recordPattern(userIdHash, pattern);
      }
    }

    return patterns;
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error detecting patterns:', err);
    return [];
  }
}

/**
 * Check for rapid escalation
 * Multiple violations in short time span (24 hours)
 */
async function checkRapidEscalation(userIdHash) {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE user_id_hash = $1 
       AND created_at > NOW() - INTERVAL '24 hours'
       AND is_active = TRUE`,
      [userIdHash]
    );

    const violationCount = parseInt(rows[0].count);

    // If 3+ violations in 24 hours
    if (violationCount >= 3) {
      return {
        type: PATTERN_TYPES.RAPID_ESCALATION,
        description: `${violationCount} violations recorded in 24 hours`,
        severity: violationCount >= 5 ? 'CRITICAL' : 'HIGH',
        score: Math.min(violationCount / 5, 1.0), // Max score of 1.0
        requiresManualReview: true,
      };
    }

    return null;
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error checking rapid escalation:', err);
    return null;
  }
}

/**
 * Check for same-type repeat violations
 * Same violation type repeated multiple times in 7 days
 */
async function checkSameTypeRepeat(userIdHash, violationType) {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE user_id_hash = $1 
       AND violation_type = $2
       AND created_at > NOW() - INTERVAL '7 days'
       AND is_active = TRUE`,
      [userIdHash, violationType]
    );

    const count = parseInt(rows[0].count);

    // If same type repeated 3+ times in 7 days
    if (count >= 3) {
      return {
        type: PATTERN_TYPES.SAME_TYPE_REPEAT,
        description: `${count} violations of type "${violationType}" in 7 days`,
        severity: count >= 5 ? 'HIGH' : 'MEDIUM',
        score: Math.min(count / 5, 1.0),
        requiresManualReview: true,
        violationType: violationType,
      };
    }

    return null;
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error checking same-type repeat:', err);
    return null;
  }
}

/**
 * Check if user is approaching enforcement threshold
 * Warning: "You're close to escalation"
 */
async function checkThresholdWarning(userIdHash, violationType) {
  try {
    const { rows } = await db.query(
      `SELECT violation_count FROM user_violations 
       WHERE user_id_hash = $1 
       AND violation_type = $2
       ORDER BY created_at DESC LIMIT 1`,
      [userIdHash, violationType]
    );

    if (rows.length === 0) return null;

    const currentCount = rows[0].violation_count;

    // Warn if at violation count 1 (next is suspension at 2)
    if (currentCount === 1) {
      return {
        type: PATTERN_TYPES.THRESHOLD_WARNING,
        description: `Account at 1 violation for "${violationType}" - next violation will trigger 7-day suspension`,
        severity: 'MEDIUM',
        score: 0.5,
        requiresManualReview: false,
        violationType: violationType,
        currentCount: currentCount,
      };
    }

    return null;
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error checking threshold warning:', err);
    return null;
  }
}

/**
 * Check for false positive clusters
 * User reported multiple violations as false positives
 */
async function checkFalsePositiveCluster(userIdHash) {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE user_id_hash = $1 
       AND reported_as_false_positive = TRUE
       AND created_at > NOW() - INTERVAL '30 days'`,
      [userIdHash]
    );

    const count = parseInt(rows[0].count);

    // If 3+ false positives reported in 30 days
    if (count >= 3) {
      return {
        type: PATTERN_TYPES.FALSE_POSITIVE_CLUSTER,
        description: `${count} violations reported as false positives in 30 days`,
        severity: 'MEDIUM',
        score: count / 10, // Lower score than actual violations
        requiresManualReview: true,
      };
    }

    return null;
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error checking false positive cluster:', err);
    return null;
  }
}

/**
 * Check for low confidence detection pattern
 * Multiple low-confidence detections might indicate detection tuning needed
 */
async function checkLowConfidencePattern(userIdHash) {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE user_id_hash = $1 
       AND confidence_score < 0.7
       AND created_at > NOW() - INTERVAL '30 days'`,
      [userIdHash]
    );

    const count = parseInt(rows[0].count);

    // If 5+ low confidence detections in 30 days
    if (count >= 5) {
      return {
        type: PATTERN_TYPES.LOW_CONFIDENCE_FLAGGING,
        description: `${count} violations with confidence < 0.7 detected in 30 days`,
        severity: 'LOW',
        score: 0.3,
        requiresManualReview: true,
      };
    }

    return null;
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error checking low confidence pattern:', err);
    return null;
  }
}

/**
 * Record a detected pattern in database
 */
async function recordPattern(userIdHash, pattern) {
  try {
    await db.query(
      `INSERT INTO violation_patterns 
       (pattern_type, violation_type, pattern_description, user_id_hash, violation_count, 
        severity, pattern_score, requires_manual_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        pattern.type,
        pattern.violationType || null,
        pattern.description,
        userIdHash,
        1,
        pattern.severity,
        pattern.score,
        pattern.requiresManualReview,
      ]
    );
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error recording pattern:', err);
  }
}

/**
 * Get all patterns requiring manual review for a user
 */
export async function getPatternsRequiringReview(userIdHash) {
  try {
    const { rows } = await db.query(
      `SELECT * FROM violation_patterns 
       WHERE user_id_hash = $1 
       AND requires_manual_review = TRUE 
       AND reviewed_at IS NULL
       ORDER BY created_at DESC`,
      [userIdHash]
    );

    return rows;
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error fetching patterns:', err);
    return [];
  }
}

/**
 * Mark pattern as reviewed
 */
export async function markPatternAsReviewed(patternId, notes) {
  try {
    await db.query(
      `UPDATE violation_patterns 
       SET reviewed_at = CURRENT_TIMESTAMP, 
           manual_review_notes = $1
       WHERE id = $2`,
      [notes, patternId]
    );
  } catch (err) {
    console.error('[PATTERN-DETECTION] Error marking pattern as reviewed:', err);
    return false;
  }
}
