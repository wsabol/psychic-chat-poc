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
    const complianceResult = await db.query(`
      SELECT 
        COUNT(*) as total_with_consents,
        COUNT(*) FILTER (WHERE terms_version = $1 AND privacy_version = $2) as fully_compliant,
        COUNT(*) FILTER (WHERE terms_version = $1) as terms_current,
        COUNT(*) FILTER (WHERE privacy_version = $2) as privacy_current,
        COUNT(*) FILTER (WHERE requires_consent_update = true) as requires_action
      FROM user_consents
    `, [termsVersion, privacyVersion]);

    const compliance = complianceResult.rows[0];
    const fullyCompliant = parseInt(compliance.fully_compliant);
    const totalWithConsents = parseInt(compliance.total_with_consents);

    return res.json({
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
    const result = await db.query(`
      SELECT 
        'terms' as document_type,
        terms_version as version,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE terms_accepted = true) as accepted,
        COUNT(*) FILTER (WHERE terms_accepted = true) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_percentage,
        COUNT(*) FILTER (WHERE requires_consent_update = true) as requires_action,
        MIN(terms_accepted_at) as earliest_acceptance,
        MAX(terms_accepted_at) as latest_acceptance
      FROM user_consents
      WHERE terms_version IS NOT NULL
      GROUP BY terms_version
      
      UNION ALL
      
      SELECT 
        'privacy' as document_type,
        privacy_version as version,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE privacy_accepted = true) as accepted,
        COUNT(*) FILTER (WHERE privacy_accepted = true) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_percentage,
        COUNT(*) FILTER (WHERE requires_consent_update = true) as requires_action,
        MIN(privacy_accepted_at) as earliest_acceptance,
        MAX(privacy_accepted_at) as latest_acceptance
      FROM user_consents
      WHERE privacy_version IS NOT NULL
      GROUP BY privacy_version
      
      ORDER BY document_type, version DESC
    `);

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
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
    const { status = 'all', limit = 50, offset = 0 } = req.query;
    const termsVersion = getCurrentTermsVersion();
    const privacyVersion = getCurrentPrivacyVersion();

    let whereClause = '1=1';
    
    if (status === 'compliant') {
      whereClause = `(uc.terms_version = $1 AND uc.privacy_version = $2)`;
    } else if (status === 'non-compliant') {
      whereClause = `(uc.terms_version != $1 OR uc.privacy_version != $2)`;
    } else if (status === 'requires-action') {
      whereClause = `uc.requires_consent_update = true`;
    }

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
        (
          SELECT COUNT(*) FROM messages 
          WHERE user_id_hash = uc.user_id_hash 
          AND created_at > NOW() - INTERVAL '30 days'
        ) as recent_activity,
        uc.updated_at
      FROM user_consents uc
      WHERE ${whereClause}
      ORDER BY uc.updated_at DESC
      LIMIT $3 OFFSET $4
    `;

    const params = status === 'all' 
      ? [null, null, limit, offset]
      : [termsVersion, privacyVersion, limit, offset];

    const result = await db.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count FROM user_consents uc
      WHERE ${whereClause}
    `;
    const countParams = status === 'all' ? [null, null] : [termsVersion, privacyVersion];
    const countResult = await db.query(countQuery, countParams);

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      filters: { status, limit: parseInt(limit), offset: parseInt(offset) },
      pagination: {
        total: parseInt(countResult.rows[0].count),
        returned: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
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
        activity: {
          recentActivityDays: row.recent_activity,
          lastUpdated: row.updated_at
        }
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
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_flagged,
        COUNT(*) FILTER (WHERE last_notified_at IS NOT NULL) as notified,
        COUNT(*) FILTER (WHERE last_notified_at IS NULL) as not_yet_notified,
        ROUND(AVG(notification_count)::numeric, 2) as avg_notifications_per_user,
        MAX(notification_count) as max_notifications,
        COUNT(*) FILTER (WHERE last_notified_at IS NOT NULL AND requires_consent_update = false) as accepted_after_notification,
        COUNT(*) FILTER (WHERE last_notified_at IS NOT NULL AND requires_consent_update = true) as still_requires_action_after_notification
      FROM user_consents
      WHERE requires_consent_update = true OR notification_count > 0
    `);

    const metrics = result.rows[0];
    const notified = parseInt(metrics.notified);
    const acceptedAfterNotif = parseInt(metrics.accepted_after_notification);

    return res.json({
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

    let query = `
      SELECT 
        DATE(terms_accepted_at) as date,
        'terms' as document_type,
        COUNT(*) as acceptances
      FROM user_consents
      WHERE terms_accepted_at IS NOT NULL
      AND terms_accepted_at > NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(terms_accepted_at)
    `;

    if (documentType === 'both' || documentType === 'privacy') {
      query += `
        UNION ALL
        
        SELECT 
          DATE(privacy_accepted_at) as date,
          'privacy' as document_type,
          COUNT(*) as acceptances
        FROM user_consents
        WHERE privacy_accepted_at IS NOT NULL
        AND privacy_accepted_at > NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY DATE(privacy_accepted_at)
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

    return res.json({
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

    // Get all data
    const consentsResult = await db.query(`
      SELECT * FROM user_consents
      ORDER BY updated_at DESC
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
