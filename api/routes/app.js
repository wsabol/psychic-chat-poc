/**
 * App Version — Public Endpoint
 *
 * GET /app/version
 *   Returns the current "latest" and "minimum supported" version strings so
 *   the mobile client can decide whether to show a soft update prompt or a
 *   hard blocking screen.
 *
 * No authentication required — free-trial users (no account) and users who
 * are still mid-onboarding also need to know if their build is too old.
 *
 * Config is stored in the `app_version_config` table (single row, id = 1).
 * If that table doesn't exist yet (migration not run), falls back gracefully
 * to environment-variable defaults so the endpoint is safe to deploy first.
 *
 * ENV var fallbacks (all optional):
 *   APP_LATEST_VERSION   — e.g. "3.3.26"   (default: matches current build)
 *   APP_MINIMUM_VERSION  — e.g. "3.0.0"    (default: permissive floor)
 *   IOS_STORE_URL        — Apple App Store link (default: empty string)
 */

import { Router } from 'express';
import { db } from '../shared/db.js';
import { successResponse, serverError } from '../utils/responses.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const router = Router();

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.starshippsychicsmobile';

// ─── GET /app/version ─────────────────────────────────────────────────────────
//
// Response shape:
// {
//   success:         true,
//   latestVersion:   "3.3.27",   // newest published build
//   minimumVersion:  "3.0.0",    // oldest still-supported build
//   androidStoreUrl: "https://play.google.com/…",
//   iosStoreUrl:     "https://apps.apple.com/…",
//   releaseNotes:    "Bug fixes and performance improvements" | null
// }
//
// Client logic (see mobile/src/hooks/useAppVersion.ts):
//   installed < minimumVersion → force update (blocking modal, no dismiss)
//   installed < latestVersion  → soft prompt  (dismissible banner/modal)
//   installed >= latestVersion → nothing shown

router.get('/version', async (req, res) => {
  // Hard-coded defaults — used when the DB table doesn't exist yet.
  const defaults = {
    latest_version:    process.env.APP_LATEST_VERSION   ?? '3.4.2',
    minimum_version:   process.env.APP_MINIMUM_VERSION  ?? '3.0.0',
    android_store_url: PLAY_STORE_URL,
    ios_store_url:     process.env.IOS_STORE_URL        ?? '',
    release_notes:     null,
  };

  let config = defaults;

  try {
    const result = await db.query(
      `SELECT latest_version, minimum_version,
              android_store_url, ios_store_url, release_notes
         FROM app_version_config
        WHERE id = 1`,
    );
    if (result.rows.length > 0) {
      // Merge so that any NULL column in the DB row falls back to the default.
      const row = result.rows[0];
      config = {
        latest_version:    row.latest_version    ?? defaults.latest_version,
        minimum_version:   row.minimum_version   ?? defaults.minimum_version,
        android_store_url: row.android_store_url ?? defaults.android_store_url,
        ios_store_url:     row.ios_store_url     ?? defaults.ios_store_url,
        release_notes:     row.release_notes     ?? null,
      };
    }
  } catch {
    // Table hasn't been created yet — use the defaults above.
    // This is intentionally non-fatal so the API can be deployed before the
    // migration runs without causing startup failures.
  }

  try {
    return successResponse(res, {
      success:         true,
      latestVersion:   config.latest_version,
      minimumVersion:  config.minimum_version,
      androidStoreUrl: config.android_store_url || PLAY_STORE_URL,
      iosStoreUrl:     config.ios_store_url     || '',
      releaseNotes:    config.release_notes,
    });
  } catch (err) {
    await logErrorFromCatch(err, 'app', 'get-version');
    return serverError(res, 'Failed to fetch version info');
  }
});

export default router;
