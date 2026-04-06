/**
 * Admin — App Version Management
 *
 * Endpoints for reading and updating the app version configuration.
 *
 * Routes (all require admin auth):
 *   GET  /admin/app/version-config   — read current config
 *   POST /admin/app/set-version      — update version config
 *                                      (optionally triggers email blast)
 *
 * The version config is stored in `app_version_config` (single row, id = 1).
 * Run api/migrations/20260406_add_app_version_config.sql before using.
 *
 * Email blast integration:
 *   Set { sendEmailBlast: true } in the POST body to simultaneously send the
 *   "app has been updated" announcement email to all eligible users.
 *   Requires the X-Confirm-Send-All: SEND_TO_ALL_USERS header (same as the
 *   standalone /admin/announcements/send-app-update endpoint).
 *
 * Safety:
 *   • All routes require admin Firebase ID token (enforced by requireAdmin).
 *   • Live email blasts additionally require the X-Confirm-Send-All header.
 */

import { Router } from 'express';
import { auth } from '../../shared/firebase-admin.js';
import { db } from '../../shared/db.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { logAudit } from '../../shared/auditLog.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { serverError, successResponse, validationError } from '../../utils/responses.js';
import { sendEmail } from '../../shared/email/emailSender.js';
import { generateAppUpdateEmail } from '../../shared/email/templates/appUpdateEmail.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { resolveLocale } from '../../shared/email/i18n/index.js';

const router = Router();

// Every route in this file requires admin privileges.
router.use(requireAdmin);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple semver comparison; returns -1, 0, or 1. */
function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db_ = pb[i] ?? 0;
    if (da < db_) return -1;
    if (da > db_) return 1;
  }
  return 0;
}

/** Validate that a string looks like a semver-style version (e.g. "3.3.26"). */
function isValidVersion(v) {
  return typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v.trim());
}

// ─── GET /admin/app/version-config ────────────────────────────────────────────
// Returns the current version config stored in the DB.

router.get('/app/version-config', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, latest_version, minimum_version,
              android_store_url, ios_store_url,
              release_notes, updated_at, updated_by
         FROM app_version_config
        WHERE id = 1`,
    );

    if (result.rows.length === 0) {
      return successResponse(res, {
        success: true,
        config: null,
        message: 'No version config found. Run the 20260406_add_app_version_config.sql migration first.',
      });
    }

    const row = result.rows[0];
    return successResponse(res, {
      success: true,
      config: {
        latestVersion:   row.latest_version,
        minimumVersion:  row.minimum_version,
        androidStoreUrl: row.android_store_url,
        iosStoreUrl:     row.ios_store_url,
        releaseNotes:    row.release_notes,
        updatedAt:       row.updated_at,
        updatedBy:       row.updated_by,
      },
    });
  } catch (err) {
    await logErrorFromCatch(err, 'admin', 'get-app-version-config', req.user?.userId);
    return serverError(res, 'Failed to fetch version config');
  }
});

// ─── POST /admin/app/set-version ──────────────────────────────────────────────
// Updates the version config and optionally fires the app-update email blast.
//
// Request body (JSON):
//   {
//     "latestVersion":   "3.3.27",      // required
//     "minimumVersion":  "3.3.0",       // required
//     "androidStoreUrl": "https://…",   // optional — keeps existing if omitted
//     "iosStoreUrl":     "https://…",   // optional — keeps existing if omitted
//     "releaseNotes":    "What's new",  // optional
//     "sendEmailBlast":  false          // default false — set true to also blast emails
//   }
//
// Required header for email blast:
//   X-Confirm-Send-All: SEND_TO_ALL_USERS

router.post('/app/set-version', async (req, res) => {
  const {
    latestVersion,
    minimumVersion,
    androidStoreUrl,
    iosStoreUrl,
    releaseNotes,
    sendEmailBlast = false,
  } = req.body ?? {};

  // ── Input validation ────────────────────────────────────────────────────────
  if (!latestVersion || !isValidVersion(latestVersion)) {
    return validationError(
      res,
      'latestVersion is required and must be a semver string like "3.3.27".',
    );
  }
  if (!minimumVersion || !isValidVersion(minimumVersion)) {
    return validationError(
      res,
      'minimumVersion is required and must be a semver string like "3.3.0".',
    );
  }
  if (compareVersions(minimumVersion, latestVersion) > 0) {
    return validationError(
      res,
      'minimumVersion cannot be greater than latestVersion.',
    );
  }

  // ── Safety gate for email blasts ────────────────────────────────────────────
  if (sendEmailBlast) {
    const confirm = req.headers['x-confirm-send-all'];
    if (confirm !== 'SEND_TO_ALL_USERS') {
      return validationError(
        res,
        'To send the email blast, add the header X-Confirm-Send-All: SEND_TO_ALL_USERS. ' +
          'Set { "sendEmailBlast": false } to update the version config without sending emails.',
      );
    }
  }

  try {
    // ── 1. Upsert the version config ─────────────────────────────────────────
    // $3 / $4 are the caller-supplied URLs (null when not provided by the
    // admin UI, which has no URL fields).  We guard the NOT NULL columns by:
    //   • COALESCE in VALUES  — so the INSERT path never writes a bare NULL
    //     into a NOT NULL column (uses the column's shipped defaults as the
    //     safety-net value).
    //   • CASE in DO UPDATE SET — so an UPDATE that omits URLs keeps whatever
    //     value the row already has (rather than overwriting with the default).
    const ANDROID_URL_DEFAULT =
      'https://play.google.com/store/apps/details?id=com.starshippsychicsmobile';

    await db.query(
      `INSERT INTO app_version_config
         (id, latest_version, minimum_version, android_store_url, ios_store_url,
          release_notes, updated_at, updated_by)
       VALUES (
         1, $1, $2,
         COALESCE($3::text, '${ANDROID_URL_DEFAULT}'),
         COALESCE($4::text, ''),
         $5, NOW(), $6
       )
       ON CONFLICT (id) DO UPDATE SET
         latest_version    = EXCLUDED.latest_version,
         minimum_version   = EXCLUDED.minimum_version,
         android_store_url = CASE WHEN $3::text IS NULL
                               THEN app_version_config.android_store_url
                               ELSE $3::text END,
         ios_store_url     = CASE WHEN $4::text IS NULL
                               THEN app_version_config.ios_store_url
                               ELSE $4::text END,
         release_notes     = EXCLUDED.release_notes,
         updated_at        = EXCLUDED.updated_at,
         updated_by        = EXCLUDED.updated_by`,
      [
        latestVersion.trim(),
        minimumVersion.trim(),
        androidStoreUrl?.trim() || null,
        iosStoreUrl?.trim()     || null,
        releaseNotes?.trim()    || null,
        req.user.userId,
      ],
    );

    // ── 2. Audit log — version update ─────────────────────────────────────────
    await logAudit(db, {
      userId:    req.user.userId,
      action:    'ADMIN_SET_APP_VERSION',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status:    'SUCCESS',
      details:   { latestVersion, minimumVersion, sendEmailBlast },
    });

    // ── 3. Optional email blast ────────────────────────────────────────────────
    let emailStats = null;

    if (sendEmailBlast) {
      // Replicate the same blast logic as /admin/announcements/send-app-update.
      // Include every registered user (any onboarding state) except admins.
      // Firebase will return no email for UIDs that never verified, so users
      // without an email address are automatically skipped below.
      const userRows = await db.query(
        `SELECT user_id
           FROM user_personal_info
          WHERE is_admin IS DISTINCT FROM TRUE`,
      );
      const userIds = userRows.rows.map(r => r.user_id);

      // Language preferences (best-effort).
      const hashToLocale = {};
      try {
        const prefRows = await db.query(
          `SELECT user_id_hash, language FROM user_preferences WHERE language IS NOT NULL`,
        );
        prefRows.rows.forEach(row => {
          hashToLocale[row.user_id_hash] = row.language;
        });
      } catch {
        // Non-fatal — all users fall back to en-US.
      }

      // Batch-fetch emails from Firebase (max 100 UIDs per call).
      const uidToEmail = {};
      const FIREBASE_BATCH = 100;
      for (let i = 0; i < userIds.length; i += FIREBASE_BATCH) {
        const batch = userIds.slice(i, i + FIREBASE_BATCH);
        try {
          const { users } = await auth.getUsers(batch.map(uid => ({ uid })));
          users.forEach(u => {
            if (u.email) uidToEmail[u.uid] = u.email;
          });
        } catch (fbErr) {
          await logErrorFromCatch(fbErr, 'admin', 'set-version-firebase-batch', req.user?.userId);
        }
      }

      // Send emails.
      let sent = 0, failed = 0, skipped = 0;
      const failures = [];

      for (const uid of userIds) {
        const email = uidToEmail[uid];
        if (!email) { skipped++; continue; }

        const userHash  = hashUserId(uid);
        const rawLocale = hashToLocale[userHash] ?? 'en-US';
        const locale    = resolveLocale(rawLocale);

        const { subject, html, trackingSettings } = generateAppUpdateEmail({ locale });
        const result = await sendEmail({ to: email, subject, html, trackingSettings });

        if (result.success) {
          sent++;
        } else {
          failed++;
          failures.push({ uid, email, error: result.error });
        }
      }

      emailStats = { total: userIds.length, sent, failed, skipped };

      // Audit log — email blast.
      await logAudit(db, {
        userId:    req.user.userId,
        action:    'ADMIN_SEND_APP_UPDATE_EMAIL',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status:    'SUCCESS',
        details:   emailStats,
      });
    }

    return successResponse(res, {
      success: true,
      message: sendEmailBlast
        ? 'Version config updated and email blast sent.'
        : 'Version config updated.',
      config: { latestVersion, minimumVersion },
      ...(emailStats && { emailBlastStats: emailStats }),
    });
  } catch (err) {
    await logErrorFromCatch(err, 'admin', 'set-app-version', req.user?.userId);
    return serverError(res, 'Failed to update version config');
  }
});

export default router;
