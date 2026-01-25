/**
 * Violation Report Service
 * Business logic for violation reporting and analytics
 */

import { db } from '../shared/db.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { parseIntVal, parseFloatVal, calculatePercent } from '../shared/dataUtils.js';
import { VIOLATIONS_CONFIG } from '../config/violations.js';

/**
 * Generate summary statistics
 * Uses single optimized query instead of 7 separate queries
 */
export async function generateSummary() {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN violation_count = 1 THEN 1 ELSE 0 END) as warnings,
        SUM(CASE WHEN violation_count = 2 THEN 1 ELSE 0 END) as suspensions,
        SUM(CASE WHEN is_account_disabled = TRUE THEN 1 ELSE 0 END) as bans,
        SUM(CASE WHEN violation_redeemed_at IS NOT NULL THEN 1 ELSE 0 END) as redemptions,
        SUM(CASE WHEN reported_as_false_positive = TRUE THEN 1 ELSE 0 END) as false_positives,
        AVG(CASE WHEN confidence_score > 0 THEN confidence_score ELSE NULL END) as avg_confidence
      FROM user_violations
      WHERE is_active = TRUE
    `);

    const data = rows[0];
    return {
      total_active_violations: parseIntVal(data.total),
      warnings_issued: parseIntVal(data.warnings),
      suspensions_issued: parseIntVal(data.suspensions),
      permanent_bans: parseIntVal(data.bans),
      successful_redemptions: parseIntVal(data.redemptions),
      reported_false_positives: parseIntVal(data.false_positives),
      avg_detection_confidence: parseFloatVal(data.avg_confidence),
      data_period_days: VIOLATIONS_CONFIG.DATA_PERIOD_DAYS,
    };
  } catch (err) {
    logErrorFromCatch('Error generating summary:', err);
    return {};
  }
}

/**
 * Get violations breakdown by type
 */
export async function getViolationsByType() {
  try {
    const { rows } = await db.query(
      `SELECT 
        violation_type,
        COUNT(*) as total,
        SUM(CASE WHEN violation_count = 1 THEN 1 ELSE 0 END) as warnings,
        SUM(CASE WHEN violation_count = 2 THEN 1 ELSE 0 END) as suspensions,
        SUM(CASE WHEN violation_count >= 3 THEN 1 ELSE 0 END) as escalations,
        SUM(CASE WHEN reported_as_false_positive THEN 1 ELSE 0 END) as reported_false_positives,
        AVG(confidence_score) as avg_confidence
       FROM user_violations 
       WHERE is_active = TRUE
       GROUP BY violation_type
       ORDER BY total DESC`
    );

    return rows.map(row => ({
      type: row.violation_type,
      total: parseIntVal(row.total),
      warnings: parseIntVal(row.warnings),
      suspensions: parseIntVal(row.suspensions),
      escalations: parseIntVal(row.escalations),
      reported_false_positives: parseIntVal(row.reported_false_positives),
      avg_confidence_score: parseFloatVal(row.avg_confidence),
      false_positive_rate: parseFloatVal(row.reported_false_positives) / parseFloatVal(row.total) || 0,
    }));
  } catch (err) {
    logErrorFromCatch('Error getting violations by type:', err);
    return [];
  }
}

/**
 * Get escalation metrics
 */
export async function getEscalationMetrics() {
  try {
    const { rows } = await db.query(`
      SELECT 
        violation_type,
        COUNT(*) as total,
        SUM(CASE WHEN violation_count = 1 THEN 1 ELSE 0 END) as count_1,
        SUM(CASE WHEN violation_count = 2 THEN 1 ELSE 0 END) as count_2,
        SUM(CASE WHEN violation_count >= 3 THEN 1 ELSE 0 END) as count_3_plus
      FROM user_violations 
      WHERE is_active = TRUE
      GROUP BY violation_type
    `);

    return rows.map(row => {
      const total = parseIntVal(row.total);
      return {
        violation_type: row.violation_type,
        total,
        first_offense_pct: calculatePercent(parseIntVal(row.count_1), total),
        second_offense_pct: calculatePercent(parseIntVal(row.count_2), total),
        permanent_ban_pct: calculatePercent(parseIntVal(row.count_3_plus), total),
      };
    });
  } catch (err) {
    logErrorFromCatch('Error getting escalation metrics:', err);
    return [];
  }
}

/**
 * Get redemption analytics
 */
export async function getRedemptionAnalytics() {
  try {
    const { rows } = await db.query(`
      SELECT 
        violation_type,
        COUNT(*) as total,
        SUM(CASE WHEN violation_redeemed_at IS NOT NULL THEN 1 ELSE 0 END) as redeemed,
        AVG(EXTRACT(EPOCH FROM (violation_redeemed_at - last_violation_timestamp))/3600) as avg_hours
      FROM user_violations 
      WHERE is_active = TRUE 
      AND violation_type = ANY($1::text[])
      GROUP BY violation_type
    `, [VIOLATIONS_CONFIG.REDEEMABLE_TYPES]);

    return rows.map(row => {
      const total = parseIntVal(row.total);
      const redeemed = parseIntVal(row.redeemed);
      return {
        violation_type: row.violation_type,
        total_eligible: total,
        successfully_redeemed: redeemed,
        redemption_rate: calculatePercent(redeemed, total),
        avg_hours_to_redemption: parseFloatVal(row.avg_hours),
      };
    });
  } catch (err) {
    logErrorFromCatch('Error getting redemption analytics:', err);
    return [];
  }
}

/**
 * Get false positive analysis
 */
export async function getFalsePositiveAnalysis() {
  try {
    const [byType, topReasons] = await Promise.all([
      db.query(`
        SELECT 
          violation_type,
          COUNT(*) as total,
          COUNT(DISTINCT user_id_hash) as reporters
        FROM violation_false_positives 
        WHERE resolved_at IS NULL
        GROUP BY violation_type
        ORDER BY total DESC
      `),
      db.query(`
        SELECT 
          false_positive_reason as reason,
          COUNT(*) as count
        FROM violation_false_positives 
        WHERE resolved_at IS NULL
        GROUP BY false_positive_reason
        ORDER BY count DESC
        LIMIT $1
      `, [VIOLATIONS_CONFIG.TOP_REASONS_LIMIT]),
    ]);

    return {
      by_type: byType.rows.map(row => ({
        type: row.violation_type,
        reported: parseIntVal(row.total),
        unique_reporters: parseIntVal(row.reporters),
      })),
      top_reasons: topReasons.rows.map(row => ({
        reason: row.reason,
        count: parseIntVal(row.count),
      })),
    };
  } catch (err) {
    logErrorFromCatch('Error getting false positive analysis:', err);
    return { by_type: [], top_reasons: [] };
  }
}

/**
 * Get pattern analysis
 */
export async function getPatternAnalysis() {
  try {
    const [detected, pending] = await Promise.all([
      db.query(`
        SELECT 
          pattern_type,
          severity,
          COUNT(*) as count,
          SUM(CASE WHEN reviewed_at IS NOT NULL THEN 1 ELSE 0 END) as reviewed,
          AVG(pattern_score) as avg_score
        FROM violation_patterns 
        WHERE created_at > NOW() - INTERVAL $1
        GROUP BY pattern_type, severity
        ORDER BY count DESC
      `, [VIOLATIONS_CONFIG.PATTERN_TIME_WINDOW]),
      db.query(`
        SELECT 
          pattern_type,
          COUNT(*) as count
        FROM violation_patterns 
        WHERE requires_manual_review = TRUE AND reviewed_at IS NULL
        GROUP BY pattern_type
      `),
    ]);

    return {
      patterns_detected: detected.rows.map(row => ({
        pattern_type: row.pattern_type,
        severity: row.severity,
        detected_count: parseIntVal(row.count),
        reviewed: parseIntVal(row.reviewed),
        avg_pattern_score: parseFloatVal(row.avg_score),
      })),
      requiring_manual_review: pending.rows.map(row => ({
        pattern_type: row.pattern_type,
        pending_review: parseIntVal(row.count),
      })),
    };
  } catch (err) {
    logErrorFromCatch('Error getting pattern analysis:', err);
    return { patterns_detected: [], requiring_manual_review: [] };
  }
}

/**
 * Get trending analysis (last 30 days)
 */
export async function getTrendingAnalysis() {
  try {
    const [messages, daily] = await Promise.all([
      db.query(`
        SELECT 
          violation_message,
          violation_type,
          COUNT(*) as frequency
        FROM user_violations 
        WHERE created_at > NOW() - INTERVAL $1 
        AND is_active = TRUE
        AND violation_message IS NOT NULL
        GROUP BY violation_message, violation_type
        ORDER BY frequency DESC
        LIMIT $2
      `, [VIOLATIONS_CONFIG.TREND_TIME_WINDOW, VIOLATIONS_CONFIG.TRENDING_KEYWORDS_LIMIT]),
      db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total,
          COUNT(DISTINCT violation_type) as types
        FROM user_violations 
        WHERE created_at > NOW() - INTERVAL $1
        AND is_active = TRUE
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, [VIOLATIONS_CONFIG.TREND_TIME_WINDOW]),
    ]);

    return {
      trending_messages: messages.rows.map(row => ({
        message_preview: row.violation_message?.substring(0, 100),
        type: row.violation_type,
        frequency: parseIntVal(row.frequency),
      })),
      daily_trend: daily.rows.map(row => ({
        date: row.date,
        violations: parseIntVal(row.total),
        unique_types: parseIntVal(row.types),
      })),
    };
  } catch (err) {
    logErrorFromCatch('Error getting trending analysis:', err);
    return { trending_messages: [], daily_trend: [] };
  }
}

/**
 * Mark a violation as false positive
 * @param {string} violationId - Violation ID
 * @param {string} reason - Reason for false positive
 * @param {string} context - Optional context explanation
 * @returns {Promise<Object>} Result object
 */
export async function markAsFalsePositive(violationId, reason, context = null) {
  try {
    // Get the violation
    const { rows: violations } = await db.query(
      `SELECT * FROM user_violations WHERE id = $1`,
      [violationId]
    );

    if (violations.length === 0) {
      return { success: false, error: 'Violation not found' };
    }

    const violation = violations[0];

    // Mark as false positive
    await db.query(
      `UPDATE user_violations 
       SET reported_as_false_positive = TRUE, 
           false_positive_reason = $1
       WHERE id = $2`,
      [reason, violationId]
    );

    // Record in false positives table
    await db.query(
      `INSERT INTO violation_false_positives 
       (violation_id, user_id_hash, violation_type, original_message, false_positive_reason, context_explanation)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        violationId,
        violation.user_id_hash,
        violation.violation_type,
        violation.violation_message,
        reason,
        context
      ]
    );

    return { success: true, message: 'Violation marked as false positive' };
  } catch (err) {
    logErrorFromCatch('Error marking false positive:', err);
    return { success: false, error: 'Failed to mark false positive' };
  }
}

/**
 * Get complete violation report
 * @returns {Promise<Object>} Complete report
 */
export async function getCompleteReport() {
  const [summary, byType, escalation, redemption, falsePositives, patterns, trending] = await Promise.all([
    generateSummary(),
    getViolationsByType(),
    getEscalationMetrics(),
    getRedemptionAnalytics(),
    getFalsePositiveAnalysis(),
    getPatternAnalysis(),
    getTrendingAnalysis(),
  ]);

  return {
    generated_at: new Date().toISOString(),
    summary,
    by_type: byType,
    escalation_metrics: escalation,
    redemption_analytics: redemption,
    false_positive_analysis: falsePositives,
    patterns,
    trending,
  };
}
