/**
 * Admin — Announcements
 *
 * Endpoints for sending broadcast emails to all registered users.
 *
 * Current announcements:
 *   POST /admin/announcements/send-app-update   — "app has been updated" email blast
 *
 * All endpoints require:
 *   • A valid admin Firebase ID token  (enforced by authenticateToken in index.js)
 *   • Admin email in ADMIN_EMAILS env var  (enforced by requireAdmin below)
 *
 * Safety:
 *   • dryRun: true in the request body returns a count preview without sending.
 *   • Real sends require the header  X-Confirm-Send-All: SEND_TO_ALL_USERS  to
 *     prevent accidental blasts.
 *
 * Email delivery:
 *   • Recipient list is derived from user_personal_info (onboarding-complete rows).
 *   • Emails are fetched from Firebase Auth in batches of 100 via auth.getUsers().
 *   • Language preference is resolved from user_preferences.language → locale.
 *   • Emails are sent one-at-a-time (no bulk SendGrid endpoint needed) so that
 *     individual failures are collected without aborting the blast.
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
// authenticateToken is already applied at the /admin mount in index.js.
router.use(requireAdmin);

// ─── POST /admin/announcements/send-app-update ────────────────────────────────
// Sends the "Starship Psychics has been updated — download it on Google Play"
// email to every non-admin user who has completed onboarding.
//
// Request body (JSON):
//   { "dryRun": true }  — returns count of eligible users without sending.
//   { "dryRun": false } — actually sends (also requires confirmation header).
//
// Required header for live sends:
//   X-Confirm-Send-All: SEND_TO_ALL_USERS

router.post('/announcements/send-app-update', async (req, res) => {
  const { dryRun = false } = req.body ?? {};

  // ── Safety gate for live sends ─────────────────────────────────────────────
  if (!dryRun) {
    const confirm = req.headers['x-confirm-send-all'];
    if (confirm !== 'SEND_TO_ALL_USERS') {
      return validationError(
        res,
        'Add the header X-Confirm-Send-All: SEND_TO_ALL_USERS to confirm the email blast, or set { "dryRun": true } for a preview.',
      );
    }
  }

  try {
    // ── 1. Eligible recipients ─────────────────────────────────────────────
    // Match the same "onboarding complete" definition used everywhere else:
    //   onboarding_completed = TRUE  OR  onboarding_step IN ('personal_info', 'welcome')
    const userRows = await db.query(
      `SELECT user_id
         FROM user_personal_info
        WHERE (onboarding_completed = TRUE
               OR onboarding_step IN ('personal_info', 'welcome'))
          AND (is_admin IS DISTINCT FROM TRUE)`,
    );

    const userIds = userRows.rows.map(r => r.user_id);

    // ── Dry-run: return count and bail ─────────────────────────────────────
    if (dryRun) {
      return successResponse(res, {
        success: true,
        dryRun: true,
        totalEligibleUsers: userIds.length,
        message: `Dry run complete. ${userIds.length} user(s) would receive this email.`,
      });
    }

    // ── 2. Language preferences (best-effort; non-fatal if table is empty) ──
    // user_preferences stores language as a BCP-47 locale string (e.g. 'es-ES').
    // user_preferences.user_id_hash = SHA-256 of Firebase UID.
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

    // ── 3. Batch-fetch emails from Firebase (max 100 UIDs per call) ─────────
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
        await logErrorFromCatch(
          fbErr,
          'admin',
          'app-update-email-firebase-batch',
          req.user?.userId,
        );
        // Continue — partial failures should not abort the entire blast.
      }
    }

    // ── 4. Send emails ─────────────────────────────────────────────────────
    let sent    = 0;
    let failed  = 0;
    let skipped = 0;
    const failures = [];

    for (const uid of userIds) {
      const email = uidToEmail[uid];
      if (!email) {
        skipped++;
        continue;
      }

      // Resolve locale: SHA-256 hash → language preference → BCP-47 resolve.
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

    // ── 5. Audit log ────────────────────────────────────────────────────────
    await logAudit(db, {
      userId: req.user.userId,
      action: 'ADMIN_SEND_APP_UPDATE_EMAIL',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { total: userIds.length, sent, failed, skipped },
    });

    return successResponse(res, {
      success: true,
      message: 'App update email blast complete.',
      stats: { total: userIds.length, sent, failed, skipped },
      ...(failures.length > 0 && { failures }),
    });
  } catch (err) {
    await logErrorFromCatch(err, 'admin', 'send-app-update-email', req.user?.userId);
    return serverError(res, 'Failed to send app update emails');
  }
});

export default router;
