/**
 * Violation Reporting API
 * Provides analytics and monitoring endpoints for admin dashboard
 * 
 * Endpoints:
 * - GET /violations/report - Full violation report
 * - GET /violations/stats - Quick statistics
 * - GET /violations/patterns - Detected patterns
 * - GET /violations/false-positives - False positive analysis
 * - POST /violations/false-positive - Mark violation as false positive
 */

import express from 'express';
import { db } from '../shared/db.js';
import { validationError, notFoundError, serverError } from '../utils/responses.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { successResponse } from '../utils/responses.js';

const router = express.Router();

// ============ Constants ============
const REDEEMABLE_TYPES = ['abusive_language', 'sexual_content'];
const PATTERN_TIME_WINDOW = '30 days';
const TREND_TIME_WINDOW = '30 days';
const TOP_REASONS_LIMIT = 10;
const TRENDING_KEYWORDS_LIMIT = 20;
const DATA_PERIOD_DAYS = 90;

// ============ Error Handler ============
/**
 * Standardized error handler for routes
 */
const handleError = (res, label, err, fallback = {}) => {
  return serverError(res, `Failed to ${label.toLowerCase()}`);
};

// ============ Row Parsers ============
/**
 * Parse values safely from database rows
 */
const parseCount = (row) => globalThis.parseInt(row.count) || 0;
const parseIntVal = (val) => globalThis.parseInt(val) || 0;
const parseFloatVal = (val) => parseFloat(val) || 0;

/**
 * Calculate percentage safely
 */
const calculatePercent = (part, total) => {
  if (!total) return '0.00';
  return ((part / total) * 100).toFixed(2);
};

/**
 * GET /api/violations/report
 * Complete violation monitoring report
 */
router.get('/report', async (req, res) => {
  try {
    const [summary, byType, escalation, redemption, falsePositives, patterns, trending] = await Promise.all([
      generateSummary(),
      getViolationsByType(),
      getEscalationMetrics(),
      getRedemptionAnalytics(),
      getFalsePositiveAnalysis(),
      getPatternAnalysis(),
      getTrendingAnalysis(),
    ]);

    successResponse(res, {
      generated_at: new Date().toISOString(),
      summary,
      by_type: byType,
      escalation_metrics: escalation,
      redemption_analytics: redemption,
      false_positive_analysis: falsePositives,
      patterns,
      trending,
    });
  } catch (err) {
    handleError(res, 'VIOLATIONS-REPORT', err);
  }
});

/**
 * GET /api/violations/stats
 * Quick statistics snapshot
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await generateSummary();
    res.json(stats);
  } catch (err) {
    handleError(res, 'VIOLATIONS-STATS', err);
  }
});

/**
 * GET /api/violations/patterns
 * Violation patterns detected
 */
router.get('/patterns', async (req, res) => {
  try {
    const patterns = await getPatternAnalysis();
    res.json(patterns);
  } catch (err) {
    handleError(res, 'VIOLATIONS-PATTERNS', err);
  }
});

/**
 * GET /api/violations/false-positives
 * False positive analysis
 */
router.get('/false-positives', async (req, res) => {
  try {
    const analysis = await getFalsePositiveAnalysis();
    res.json(analysis);
  } catch (err) {
    handleError(res, 'VIOLATIONS-FP', err);
  }
});

/**
 * POST /api/violations/false-positive
 * Mark a violation as false positive
 * Body: { violationId, reason, context }
 */
router.post('/false-positive', async (req, res) => {
  try {
    const { violationId, reason, context } = req.body;

    if (!violationId || !reason) {
      return validationError(res, 'violationId and reason required');
    }

    // Get the violation
    const { rows: violations } = await db.query(
      `SELECT * FROM user_violations WHERE id = $1`,
      [violationId]
    );

    if (violations.length === 0) {
      return notFoundError(res, 'Violation not found');
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
        context || null
      ]
    );

    successResponse(res, { success: true, message: 'Violation marked as false positive' });
  } catch (err) {
    return serverError(res, 'Failed to mark false positive');
  }
});

// ============ Helper Functions ============

/**
 * Generate summary statistics
 * Uses single optimized query instead of 7 separate queries
 */
async function generateSummary() {
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
      data_period_days: DATA_PERIOD_DAYS,
    };
  } catch (err) {
    logErrorFromCatch('Error generating summary:', err);
    return {};
  }
}

/**
 * Get violations breakdown by type
 */
async function getViolationsByType() {
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
async function getEscalationMetrics() {
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
async function getRedemptionAnalytics() {
  try {
    const placeholders = REDEEMABLE_TYPES.map((_, i) => `$${i + 1}`).join(',');
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
    `, [REDEEMABLE_TYPES]);

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
async function getFalsePositiveAnalysis() {
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
      `, [TOP_REASONS_LIMIT]),
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
async function getPatternAnalysis() {
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
      `, [PATTERN_TIME_WINDOW]),
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
async function getTrendingAnalysis() {
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
      `, [TREND_TIME_WINDOW, TRENDING_KEYWORDS_LIMIT]),
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
      `, [TREND_TIME_WINDOW]),
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

export default router;
