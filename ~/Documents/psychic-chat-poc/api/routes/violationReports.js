/**
 * Violation Reporting API
 * Provides analytics and monitoring endpoints for admin dashboard
 * 
 * Endpoints:
 * - GET /api/violations/report - Full violation report
 * - GET /api/violations/stats - Quick statistics
 * - GET /api/violations/patterns - Detected patterns
 * - GET /api/violations/false-positives - False positive analysis
 * - POST /api/violations/false-positive - Mark violation as false positive
 */

import express from 'express';
import { db } from '../shared/db.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * GET /api/violations/report
 * Complete violation monitoring report
 */
router.get('/report', requireAdmin, async (req, res) => {
  try {
    const report = {
      generated_at: new Date().toISOString(),
      summary: await generateSummary(),
      by_type: await getViolationsByType(),
      escalation_metrics: await getEscalationMetrics(),
      redemption_analytics: await getRedemptionAnalytics(),
      false_positive_analysis: await getFalsePositiveAnalysis(),
      patterns: await getPatternAnalysis(),
      trending: await getTrendingAnalysis(),
    };

    res.json(report);
  } catch (err) {
    console.error('[VIOLATIONS-REPORT] Error generating report:', err);
    res.status(500).json({ error: 'Failed to generate violation report' });
  }
});

/**
 * GET /api/violations/stats
 * Quick statistics snapshot
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await generateSummary();
    res.json(stats);
  } catch (err) {
    console.error('[VIOLATIONS-STATS] Error generating stats:', err);
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

/**
 * GET /api/violations/patterns
 * Violation patterns detected
 */
router.get('/patterns', requireAdmin, async (req, res) => {
  try {
    const patterns = await getPatternAnalysis();
    res.json(patterns);
  } catch (err) {
    console.error('[VIOLATIONS-PATTERNS] Error fetching patterns:', err);
    res.status(500).json({ error: 'Failed to fetch pattern analysis' });
  }
});

/**
 * GET /api/violations/false-positives
 * False positive analysis
 */
router.get('/false-positives', requireAdmin, async (req, res) => {
  try {
    const analysis = await getFalsePositiveAnalysis();
    res.json(analysis);
  } catch (err) {
    console.error('[VIOLATIONS-FP] Error fetching false positives:', err);
    res.status(500).json({ error: 'Failed to fetch false positive analysis' });
  }
});

/**
 * POST /api/violations/false-positive
 * Mark a violation as false positive
 * Body: { violationId, reason, context }
 */
router.post('/false-positive', requireAdmin, async (req, res) => {
  try {
    const { violationId, reason, context } = req.body;

    if (!violationId || !reason) {
      return res.status(400).json({ error: 'violationId and reason required' });
    }

    // Get the violation
    const { rows: violations } = await db.query(
      `SELECT * FROM user_violations WHERE id = $1`,
      [violationId]
    );

    if (violations.length === 0) {
      return res.status(404).json({ error: 'Violation not found' });
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
    console.error('[VIOLATIONS-FP-MARK] Error marking false positive:', err);
    res.status(500).json({ error: 'Failed to mark false positive' });
  }
});

// ============ Helper Functions ============

/**
 * Generate summary statistics
 */
async function generateSummary() {
  try {
    const { rows: totalViolations } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations WHERE is_active = TRUE`
    );

    const { rows: warnings } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE is_active = TRUE AND violation_count = 1`
    );

    const { rows: suspensions } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE is_active = TRUE AND violation_count = 2`
    );

    const { rows: bans } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE is_active = TRUE AND is_account_disabled = TRUE`
    );

    const { rows: redemptions } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE violation_redeemed_at IS NOT NULL`
    );

    const { rows: falsePositives } = await db.query(
      `SELECT COUNT(*) as count FROM user_violations 
       WHERE reported_as_false_positive = TRUE`
    );

    const { rows: avgConfidence } = await db.query(
      `SELECT AVG(confidence_score) as avg_score FROM user_violations 
       WHERE confidence_score > 0`
    );

    return {
      total_active_violations: parseInt(totalViolations[0].count),
      warnings_issued: parseInt(warnings[0].count),
      suspensions_issued: parseInt(suspensions[0].count),
      permanent_bans: parseInt(bans[0].count),
      successful_redemptions: parseInt(redemptions[0].count),
      reported_false_positives: parseInt(falsePositives[0].count),
      avg_detection_confidence: parseFloat(avgConfidence[0].avg_score) || 0,
      data_period_days: 90,
    };
  } catch (err) {
    console.error('[VIOLATIONS-SUMMARY] Error:', err);
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
    console.error('[VIOLATIONS-BY-TYPE] Error:', err);
    return [];
  }
}

/**
 * Get escalation metrics
 */
async function getEscalationMetrics() {
  try {
    const { rows: escalationRates } = await db.query(
      `SELECT 
        violation_type,
        COUNT(*) as total_violations,
        SUM(CASE WHEN violation_count = 1 THEN 1 ELSE 0 END) as count_1,
        SUM(CASE WHEN violation_count = 2 THEN 1 ELSE 0 END) as count_2,
        SUM(CASE WHEN violation_count >= 3 THEN 1 ELSE 0 END) as count_3_plus
       FROM user_violations 
       WHERE is_active = TRUE
       GROUP BY violation_type`
    );

    return escalationRates.map(row => ({
      violation_type: row.violation_type,
      total: parseInt(row.total_violations),
      first_offense_pct: ((parseInt(row.count_1) / parseInt(row.total_violations)) * 100).toFixed(2),
      second_offense_pct: ((parseInt(row.count_2) / parseInt(row.total_violations)) * 100).toFixed(2),
      permanent_ban_pct: ((parseInt(row.count_3_plus) / parseInt(row.total_violations)) * 100).toFixed(2),
    }));
  } catch (err) {
    console.error('[VIOLATIONS-ESCALATION] Error:', err);
    return [];
  }
}

/**
 * Get redemption analytics
 */
async function getRedemptionAnalytics() {
  try {
    const { rows: redemptions } = await db.query(
      `SELECT 
        violation_type,
        COUNT(*) as total_redeemable,
        SUM(CASE WHEN violation_redeemed_at IS NOT NULL THEN 1 ELSE 0 END) as redeemed,
        AVG(EXTRACT(EPOCH FROM (violation_redeemed_at - last_violation_timestamp))/3600) as avg_hours_to_redeem
       FROM user_violations 
       WHERE is_active = TRUE 
       AND (violation_type = 'abusive_language' OR violation_type = 'sexual_content')
       GROUP BY violation_type`
    );

    return redemptions.map(row => ({
      violation_type: row.violation_type,
      total_eligible: parseInt(row.total_redeemable),
      successfully_redeemed: parseInt(row.redeemed),
      redemption_rate: ((parseInt(row.redeemed) / parseInt(row.total_redeemable)) * 100).toFixed(2),
      avg_hours_to_redemption: parseFloat(row.avg_hours_to_redeem) || 0,
    }));
  } catch (err) {
    console.error('[VIOLATIONS-REDEMPTION] Error:', err);
    return [];
  }
}

/**
 * Get false positive analysis
 */
async function getFalsePositiveAnalysis() {
  try {
    const { rows: fpByType } = await db.query(
      `SELECT 
        violation_type,
        COUNT(*) as total_reported,
        COUNT(DISTINCT user_id_hash) as unique_reporters
       FROM violation_false_positives 
       WHERE resolved_at IS NULL
       GROUP BY violation_type
       ORDER BY total_reported DESC`
    );

    const { rows: topReasons } = await db.query(
      `SELECT 
        false_positive_reason,
        COUNT(*) as count
       FROM violation_false_positives 
       WHERE resolved_at IS NULL
       GROUP BY false_positive_reason
       ORDER BY count DESC
       LIMIT 10`
    );

    return {
      by_type: fpByType.map(row => ({
        type: row.violation_type,
        reported: parseInt(row.total_reported),
        unique_reporters: parseInt(row.unique_reporters),
      })),
      top_reasons: topReasons.map(row => ({
        reason: row.false_positive_reason,
        count: parseInt(row.count),
      })),
    };
  } catch (err) {
    console.error('[VIOLATIONS-FP-ANALYSIS] Error:', err);
    return { by_type: [], top_reasons: [] };
  }
}

/**
 * Get pattern analysis
 */
async function getPatternAnalysis() {
  try {
    const { rows: patternsByType } = await db.query(
      `SELECT 
        pattern_type,
        severity,
        COUNT(*) as count,
        SUM(CASE WHEN reviewed_at IS NOT NULL THEN 1 ELSE 0 END) as reviewed,
        AVG(pattern_score) as avg_score
       FROM violation_patterns 
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY pattern_type, severity
       ORDER BY count DESC`
    );

    const { rows: patternsRequiringReview } = await db.query(
      `SELECT 
        pattern_type,
        COUNT(*) as count
       FROM violation_patterns 
       WHERE requires_manual_review = TRUE AND reviewed_at IS NULL
       GROUP BY pattern_type`
    );

    return {
      patterns_detected: patternsByType.map(row => ({
        pattern_type: row.pattern_type,
        severity: row.severity,
        detected_count: parseInt(row.count),
        reviewed: parseInt(row.reviewed),
        avg_pattern_score: parseFloat(row.avg_score) || 0,
      })),
      requiring_manual_review: patternsRequiringReview.map(row => ({
        pattern_type: row.pattern_type,
        pending_review: parseInt(row.count),
      })),
    };
  } catch (err) {
    console.error('[VIOLATIONS-PATTERNS] Error:', err);
    return { patterns_detected: [], requiring_manual_review: [] };
  }
}

/**
 * Get trending analysis (last 30 days)
 */
async function getTrendingAnalysis() {
  try {
    const { rows: trendingKeywords } = await db.query(
      `SELECT 
        violation_message,
        violation_type,
        COUNT(*) as frequency
       FROM user_violations 
       WHERE created_at > NOW() - INTERVAL '30 days' 
       AND is_active = TRUE
       AND violation_message IS NOT NULL
       GROUP BY violation_message, violation_type
       ORDER BY frequency DESC
       LIMIT 20`
    );

    const { rows: dailyTrend } = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(DISTINCT violation_type) as types
       FROM user_violations 
       WHERE created_at > NOW() - INTERVAL '30 days'
       AND is_active = TRUE
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    return {
      trending_messages: trendingKeywords.map(row => ({
        message_preview: row.violation_message?.substring(0, 100),
        type: row.violation_type,
        frequency: parseInt(row.frequency),
      })),
      daily_trend: dailyTrend.map(row => ({
        date: row.date,
        violations: parseInt(row.total),
        unique_types: parseInt(row.types),
      })),
    };
  } catch (err) {
    console.error('[VIOLATIONS-TRENDING] Error:', err);
    return { trending_messages: [], daily_trend: [] };
  }
}

export default router;
