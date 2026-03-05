/**
 * Compliance Dashboard API
 * 
 * Provides detailed reporting for admin dashboard
 * Shows acceptance rates, user status, and compliance metrics
 */

import { Router } from 'express';
import { db } from '../../shared/db.js';
import { getCurrentTermsVersion, getCurrentPrivacyVersion } from '../../shared/versionConfig.js';
import VERSION_CONFIG from '../../shared/versionConfig.js';
import { serverError } from '../../utils/responses.js';
import { successResponse } from '../../utils/responses.js';

const router = Router();

/**
 * GET /admin/compliance-dashboard/overview
 * High-level compliance metrics
 */
router.get('/compliance-dashboard/overview', async (req, res) => {
  try {
    const termsVersion = getCurrentTermsVersion();
    const privacyVersion = getCurrentPrivacyVersion();

    // Get total user count
    const totalUsersResult = await db.query(
      'SELECT COUNT(*) as count FROM user_personal_info'
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Get overall compliance status
    // INNER JOIN ensures we only count users who have an actual account (prevents orphaned
    // consent records from inflating counts when accounts are deleted or never fully created)
    const complianceResult = await db.query(`
      SELECT 
        COUNT(*) as total_with_consents,
        COUNT(*) FILTER (WHERE uc.terms_version = $1 AND uc.privacy_version = $2) as fully_compliant,
        COUNT(*) FILTER (WHERE uc.terms_version = $1) as terms_current,
        COUNT(*) FILTER (WHERE uc.privacy_version = $2) as privacy_current,
        COUNT(*) FILTER (WHERE uc.requires_consent_update = true) as requires_action
      FROM user_consents uc
      INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
    `, [termsVersion, privacyVersion]);

    const compliance = complianceResult.rows[0];
    const fullyCompliant = parseInt(compliance.fully_compliant);
    const totalWithConsents = parseInt(compliance.total_with_consents);

    return successResponse(res, {
      success: true,
      timestamp: new Date().toISOString(),
      currentVersions: {
        terms: {
          version: termsVersion,
          changeType: VERSION_CONFIG.terms.changeType,
          changedAt: VERSION_CONFIG.terms.changedAt
        },
        privacy: {
          version: privacyVersion,
          changeType: VERSION_CONFIG.privacy.changeType,
          changedAt: VERSION_CONFIG.privacy.changedAt
        }
      },
      metrics: {
        totalUsers,
        usersWithConsents: totalWithConsents,
        usersWithoutConsents: totalUsers - totalWithConsents,
        fullyCompliant,
        compliancePercentage: totalWithConsents > 0 
          ? ((fullyCompliant / totalWithConsents) * 100).toFixed(1)
          : 0,
        termsCompliancePercentage: totalWithConsents > 0
          ? ((parseInt(compliance.terms_current) / totalWithConsents) * 100).toFixed(1)
          : 0,
        privacyCompliancePercentage: totalWithConsents > 0
          ? ((parseInt(compliance.privacy_current) / totalWithConsents) * 100).toFixed(1)
          : 0,
        requiresAction: parseInt(compliance.requires_action),
        requiresActionPercentage: totalWithConsents > 0
          ? ((parseInt(compliance.requires_action) / totalWithConsents) * 100).toFixed(1)
          : 0
      }
    });
    } catch (error) {
    return serverError(res, 'Failed to get compliance overview');
  }
});

/**
 * GET /admin/compliance-dashboard/acceptance-by-version
 * Breakdown of acceptance rates by version
 */
router.get('/compliance-dashboard/acceptance-by-version', async (req, res) => {
  try {
    // INNER JOIN ensures orphaned consent records (no matching user_personal_info row)
    // are excluded from version-based counts
    const result = await db.query(`
      SELECT 
        'terms' as document_type,
        uc.terms_version as version,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE uc.terms_accepted = true) as accepted,
        COUNT(*) FILTER (WHERE uc.terms_accepted = true) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_percentage,
        COUNT(*) FILTER (WHERE uc.requires_consent_update = true) as requires_action,
        MIN(uc.terms_accepted_at) as earliest_acceptance,
        MAX(uc.terms_accepted_at) as latest_acceptance
      FROM user_consents uc
      INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
      WHERE uc.terms_version IS NOT NULL
      GROUP BY uc.terms_version
      
      UNION ALL
      
      SELECT 
        'privacy' as document_type,
        uc.privacy_version as version,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE uc.privacy_accepted = true) as accepted,
        COUNT(*) FILTER (WHERE uc.privacy_accepted = true) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_percentage,
        COUNT(*) FILTER (WHERE uc.requires_consent_update = true) as requires_action,
        MIN(uc.privacy_accepted_at) as earliest_acceptance,
        MAX(uc.privacy_accepted_at) as latest_acceptance
      FROM user_consents uc
      INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
      WHERE uc.privacy_version IS NOT NULL
      GROUP BY uc.privacy_version
      
      ORDER BY document_type, version DESC
    `);

    return successResponse(res, { success: true, timestamp: new Date().toISOString(),
      breakdown: result.rows.map(row => ({
        documentType: row.document_type,
        version: row.version,
        totalUsers: parseInt(row.total_users),
        acceptedCount: parseInt(row.accepted),
        acceptancePercentage: parseFloat(row.acceptance_percentage).toFixed(1),
        requiresAction: parseInt(row.requires_action),
        earliestAcceptance: row.earliest_acceptance,
        latestAcceptance: row.latest_acceptance
      }))
    });
    } catch (error) {
    return serverError(res, 'Failed to get acceptance breakdown');
  }
});

/**
 * GET /admin/compliance-dashboard/user-status
 * List users by compliance status
 * 
 * Query params:
 * - status: 'compliant' | 'non-compliant' | 'requires-action' | 'all'
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
router.get('/compliance-dashboard/user-status', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const limitVal = parseInt(req.query.limit, 10) || 50;
    const offsetVal = parseInt(req.query.offset, 10) || 0;
    const termsVersion = getCurrentTermsVersion();
    const privacyVersion = getCurrentPrivacyVersion();

    // Build query and params based on filter status.
    // Always use $1/$2 for versions (or placeholders), $3/$4 for LIMIT/OFFSET
    // so parameter count matches what PostgreSQL expects.
    let whereClause;
    let queryParams;
    let countParams;

    if (status === 'compliant') {
      whereClause = `(uc.terms_version = $1 AND uc.privacy_version = $2)`;
      queryParams  = [termsVersion, privacyVersion, limitVal, offsetVal];
      countParams  = [termsVersion, privacyVersion];
    } else if (status === 'non-compliant') {
      whereClause = `(uc.terms_version != $1 OR uc.privacy_version != $2)`;
      queryParams  = [termsVersion, privacyVersion, limitVal, offsetVal];
      countParams  = [termsVersion, privacyVersion];
    } else if (status === 'requires-action') {
      whereClause = `uc.requires_consent_update = true`;
      queryParams  = [limitVal, offsetVal];
      countParams  = [];
    } else {
      // 'all' — no version filter
      whereClause = `1=1`;
      queryParams  = [limitVal, offsetVal];
      countParams  = [];
    }

    // For 'all' and 'requires-action', LIMIT/OFFSET are $1/$2.
    // For filtered queries, LIMIT/OFFSET are $3/$4.
    const limitPlaceholder  = queryParams.length === 4 ? '$3' : '$1';
    const offsetPlaceholder = queryParams.length === 4 ? '$4' : '$2';

    // INNER JOIN filters out orphaned consent records that have no matching account
    const query = `
      SELECT 
        uc.user_id_hash,
        uc.terms_version,
        uc.terms_accepted,
        uc.terms_accepted_at,
        uc.privacy_version,
        uc.privacy_accepted,
        uc.privacy_accepted_at,
        uc.requires_consent_update,
        uc.last_notified_at,
        uc.notification_count,
        uc.updated_at
      FROM user_consents uc
      INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
      WHERE ${whereClause}
      ORDER BY uc.updated_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const countQuery = `
      SELECT COUNT(*) as count FROM user_consents uc
      INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
      WHERE ${whereClause}
    `;

    const result      = await db.query(query, queryParams);
    const countResult = await db.query(countQuery, countParams);

    return successResponse(res, {
      success: true,
      timestamp: new Date().toISOString(),
      filters: { status, limit: limitVal, offset: offsetVal },
      pagination: {
        total: parseInt(countResult.rows[0].count),
        returned: result.rows.length,
        limit: limitVal,
        offset: offsetVal
      },
      users: result.rows.map(row => ({
        userIdHash: row.user_id_hash,
        terms: {
          version: row.terms_version,
          accepted: row.terms_accepted,
          acceptedAt: row.terms_accepted_at,
          isCurrent: row.terms_version === termsVersion
        },
        privacy: {
          version: row.privacy_version,
          accepted: row.privacy_accepted,
          acceptedAt: row.privacy_accepted_at,
          isCurrent: row.privacy_version === privacyVersion
        },
        compliance: {
          requiresAction: row.requires_consent_update,
          lastNotified: row.last_notified_at,
          notificationCount: row.notification_count
        },
        lastUpdated: row.updated_at
      }))
    });
  } catch (error) {
    return serverError(res, 'Failed to get user status');
  }
});

/**
 * GET /admin/compliance-dashboard/notification-metrics
 * Track notification effectiveness
 */
router.get('/compliance-dashboard/notification-metrics', async (req, res) => {
  try {
    // INNER JOIN filters out orphaned consent records (no matching user_personal_info row)
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_flagged,
        COUNT(*) FILTER (WHERE uc.last_notified_at IS NOT NULL) as notified,
        COUNT(*) FILTER (WHERE uc.last_notified_at IS NULL) as not_yet_notified,
        ROUND(AVG(uc.notification_count)::numeric, 2) as avg_notifications_per_user,
        MAX(uc.notification_count) as max_notifications,
        COUNT(*) FILTER (WHERE uc.last_notified_at IS NOT NULL AND uc.requires_consent_update = false) as accepted_after_notification,
        COUNT(*) FILTER (WHERE uc.last_notified_at IS NOT NULL AND uc.requires_consent_update = true) as still_requires_action_after_notification
      FROM user_consents uc
      INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
      WHERE uc.requires_consent_update = true OR uc.notification_count > 0
    `);

    const metrics = result.rows[0];
    const notified = parseInt(metrics.notified);
    const acceptedAfterNotif = parseInt(metrics.accepted_after_notification);

    return successResponse(res, {
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        totalFlaggedUsers: parseInt(metrics.total_flagged),
        notificationStats: {
          notified: notified,
          notYetNotified: parseInt(metrics.not_yet_notified),
          notificationRate: metrics.total_flagged > 0 
            ? ((notified / parseInt(metrics.total_flagged)) * 100).toFixed(1)
            : 0
        },
        averageNotificationsPerUser: parseFloat(metrics.avg_notifications_per_user),
        maxNotificationsSent: parseInt(metrics.max_notifications),
        acceptanceAfterNotification: {
          accepted: acceptedAfterNotif,
          stillRequiresAction: parseInt(metrics.still_requires_action_after_notification),
          acceptanceRate: notified > 0
            ? ((acceptedAfterNotif / notified) * 100).toFixed(1)
            : 0
        }
      }
    });
    } catch (error) {
    return serverError(res, 'Failed to get notification metrics');
  }
});

/**
 * GET /admin/compliance-dashboard/timeline
 * Show acceptance over time
 * 
 * Query params:
 * - days: number (default 30) - Last N days
 * - documentType: 'terms' | 'privacy' | 'both' (default 'both')
 */
router.get('/compliance-dashboard/timeline', async (req, res) => {
  try {
    const { days = 30, documentType = 'both' } = req.query;

    // INNER JOIN filters out orphaned consent records (no matching user_personal_info row)
    let query = `
      SELECT 
        DATE(uc.terms_accepted_at) as date,
        'terms' as document_type,
        COUNT(*) as acceptances
      FROM user_consents uc
      INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
      WHERE uc.terms_accepted_at IS NOT NULL
      AND uc.terms_accepted_at > NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(uc.terms_accepted_at)
    `;

    if (documentType === 'both' || documentType === 'privacy') {
      query += `
        UNION ALL
        
        SELECT 
          DATE(uc.privacy_accepted_at) as date,
          'privacy' as document_type,
          COUNT(*) as acceptances
        FROM user_consents uc
        INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
        WHERE uc.privacy_accepted_at IS NOT NULL
        AND uc.privacy_accepted_at > NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY DATE(uc.privacy_accepted_at)
      `;
    }

    query += ' ORDER BY date DESC';

    const result = await db.query(query);

    // Group by date
    const timeline = {};
    result.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (!timeline[dateStr]) {
        timeline[dateStr] = { date: dateStr, terms: 0, privacy: 0 };
      }
      if (row.document_type === 'terms') {
        timeline[dateStr].terms = parseInt(row.acceptances);
      } else {
        timeline[dateStr].privacy = parseInt(row.acceptances);
      }
    });

    return successResponse(res, {
      success: true,
      timestamp: new Date().toISOString(),
      period: `Last ${days} days`,
      documentType,
      timeline: Object.values(timeline).sort((a, b) => new Date(b.date) - new Date(a.date))
    });
    } catch (error) {
    return serverError(res, 'Failed to get compliance timeline');
  }
});

/**
 * GET /admin/compliance-dashboard/export
 * Export compliance data as JSON for reporting
 */
router.get('/compliance-dashboard/export', async (req, res) => {
  try {
    const termsVersion = getCurrentTermsVersion();
    const privacyVersion = getCurrentPrivacyVersion();

    // INNER JOIN filters out orphaned consent records (no matching user_personal_info row)
    // so the export only includes consent records belonging to active accounts
    const consentsResult = await db.query(`
      SELECT uc.* FROM user_consents uc
      INNER JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
      ORDER BY uc.updated_at DESC
    `);

    // Build export
    const exportData = {
      exportDate: new Date().toISOString(),
      currentVersions: {
        terms: termsVersion,
        privacy: privacyVersion
      },
      userConsents: consentsResult.rows.map(row => ({
        userIdHash: row.user_id_hash,
        terms: {
          version: row.terms_version,
          accepted: row.terms_accepted,
          acceptedAt: row.terms_accepted_at
        },
        privacy: {
          version: row.privacy_version,
          accepted: row.privacy_accepted,
          acceptedAt: row.privacy_accepted_at
        },
        compliance: {
          isCurrent: row.terms_version === termsVersion && row.privacy_version === privacyVersion,
          requiresAction: row.requires_consent_update,
          lastNotified: row.last_notified_at,
          notificationCount: row.notification_count
        }
      })),
      totalRecords: consentsResult.rows.length
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-export-${new Date().getTime()}.json"`);

    return res.json(exportData);
    } catch (error) {
    return serverError(res, 'Failed to export compliance data');
  }
});

export default router;
