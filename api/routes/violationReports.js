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
 * Parse integer safely from database row
 */
const parseCount = (row) => parseInt(row.count) || 0;
const parseInt = (val) => parseInt(val) || 0;
const parseFloat2 = (val) => parseFloat(val) || 0;

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

    res.json({
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

    res.json({ success: true, message: 'Violation marked as false positive' });
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
      total_active_violations: parseInt(data.total),
      warnings_issued: parseInt(data.warnings),
      suspensions_issued: parseInt(data.suspensions),
      permanent_bans: parseInt(data.bans),
      successful_redemptions: parseInt(data.redemptions),
      reported_false_positives: parseInt(data.false_positives),
      avg_detection_confidence: parseFloat2(data.avg_confidence),
      data_period_days: DATA_PERIOD_DAYS,
    };
  } catch (err) {
    logErrorFromCatch(error, 'app', 'violations summary');
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
      total: parseInt(row.total),
      warnings: parseInt(row.warnings),
      suspensions: parseInt(row.suspensions),
      escalations: parseInt(row.escalations),
      reported_false_positives: parseInt(row.reported_false_positives),
      avg_confidence_score: parseFloat(row.avg_confidence) || 0,
      false_positive_rate: parseFloat(row.reported_false_positives) / parseFloat(row.total) || 0,
    }));
  } catch (err) {
    logErrorFromCatch(error, 'app', 'violations by type');
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
      const total = parseInt(row.total);
      return {
        violation_type: row.violation_type,
        total,
        first_offense_pct: calculatePercent(parseInt(row.count_1), total),
        second_offense_pct: calculatePercent(parseInt(row.count_2), total),
        permanent_ban_pct: calculatePercent(parseInt(row.count_3_plus), total),
      };
    });
  } catch (err) {
    logErrorFromCatch(error, 'app', 'violations escalation');
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
      const total = parseInt(row.total);
      const redeemed = parseInt(row.redeemed);
      return {
        violation_type: row.violation_type,
        total_eligible: total,
        successfully_redeemed: redeemed,
        redemption_rate: calculatePercent(redeemed, total),
        avg_hours_to_redemption: parseFloat2(row.avg_hours),
      };
    });
  } catch (err) {
    //logErrorFromCatch(error, 'app', 'violations redemption');
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
        reported: parseInt(row.total),
        unique_reporters: parseInt(row.reporters),
      })),
      top_reasons: topReasons.rows.map(row => ({
        reason: row.reason,
        count: parseInt(row.count),
      })),
    };
  } catch (err) {
    logErrorFromCatch(error, 'app', 'violations fp analysis');
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
        detected_count: parseInt(row.count),
        reviewed: parseInt(row.reviewed),
        avg_pattern_score: parseFloat2(row.avg_score),
      })),
      requiring_manual_review: pending.rows.map(row => ({
        pattern_type: row.pattern_type,
        pending_review: parseInt(row.count),
      })),
    };
  } catch (err) {
    logErrorFromCatch(error, 'app', 'violations patterns');
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
        frequency: parseInt(row.frequency),
      })),
      daily_trend: daily.rows.map(row => ({
        date: row.date,
        violations: parseInt(row.total),
        unique_types: parseInt(row.types),
      })),
    };
  } catch (err) {
    logErrorFromCatch(error, 'app', 'violations trending');
    return { trending_messages: [], daily_trend: [] };
  }
}

export default router;
