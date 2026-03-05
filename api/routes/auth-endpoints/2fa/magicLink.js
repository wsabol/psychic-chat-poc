/**
 * 2fa/magicLink.js
 *
 * Handler for:
 *   GET /auth/verify-2fa-link?token=<jwt>
 *
 * Called when the user clicks the "Verify & Sign In" button in the 2FA email.
 *
 * Flow:
 *   1. Verify the short-lived JWT in the query string.
 *   2. Find the verification_codes row by ID.
 *   3. If the code is still valid (not expired, not already used), mark it used.
 *   4. Redirect the browser to the client app with magic_verified=true and the
 *      userId so the React app can mark the 2FA session as complete in
 *      sessionStorage, allowing onAuthStateChanged to skip the 2FA screen.
 *
 * Security notes:
 *  - The JWT is signed with JWT_SECRET and has a 15-minute expiry (same as
 *    the verification code itself).
 *  - The verification_codes row is marked with verified_at on first use, so
 *    the same token cannot be replayed after 5 minutes.
 *  - The client still requires an active Firebase session for the user — the
 *    magic_verified URL param is only useful in the same browser where the
 *    user signed in (Firebase restores the session from IndexedDB/localStorage).
 */

import jwt from 'jsonwebtoken';
import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { buildAuditFields } from './helpers.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// The client app URL — defaults to production; override in dev via CLIENT_URL env var
const CLIENT_URL = process.env.CLIENT_URL || 'https://app.starshippsychics.com';

// Redirect helpers
const redirectError = (res, reason) =>
  res.redirect(`${CLIENT_URL}?verify_error=${encodeURIComponent(reason)}`);

/**
 * GET /auth/verify-2fa-link?token=<jwt>
 */
export async function verify2FALinkHandler(req, res) {
  const { token } = req.query;

  if (!token) {
    return redirectError(res, 'missing_token');
  }

  // ── 1. Verify JWT ────────────────────────────────────────────────────────
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'expired' : 'invalid';
    return redirectError(res, reason);
  }

  const { userId, codeId, isMagicLink } = payload;

  if (!userId || !codeId || !isMagicLink) {
    return redirectError(res, 'invalid');
  }

  // ── 2. Look up the verification code ────────────────────────────────────
  try {
    const codeResult = await db.query(
      `SELECT id, expires_at, verified_at FROM verification_codes WHERE id = $1`,
      [codeId]
    );

    if (codeResult.rows.length === 0) {
      return redirectError(res, 'not_found');
    }

    const verCode = codeResult.rows[0];

    // ── 3. Validate and consume the code ──────────────────────────────────
    if (verCode.verified_at) {
      // Code already used — allow a 5-minute grace window for page-refresh
      const msSinceUsed = Date.now() - new Date(verCode.verified_at).getTime();
      if (msSinceUsed > 5 * 60 * 1000) {
        return redirectError(res, 'already_used');
      }
      // Within grace period — allow the redirect (idempotent)
    } else if (new Date(verCode.expires_at) < new Date()) {
      return redirectError(res, 'expired');
    } else {
      // Mark as verified (single-use)
      await db.query(
        'UPDATE verification_codes SET verified_at = NOW() WHERE id = $1',
        [codeId]
      );
    }

    // ── 4. Audit log ──────────────────────────────────────────────────────
    await logAudit(
      db,
      buildAuditFields(req, {
        userId,
        action: 'USER_2FA_VERIFIED_MAGIC_LINK',
        status: 'SUCCESS',
      })
    );

    // ── 5. Redirect to client app ─────────────────────────────────────────
    // The React app will read magic_verified=true and uid, then store
    // `2fa_verified_<uid>` in sessionStorage so the next onAuthStateChanged
    // sees alreadyVerified=true and skips the 2FA screen.
    return res.redirect(
      `${CLIENT_URL}?magic_verified=true&uid=${encodeURIComponent(userId)}`
    );
  } catch (err) {
    console.error('[MAGIC-LINK] Unexpected error:', err);
    return redirectError(res, 'server_error');
  }
}
