/**
 * 2fa/resend.js
 *
 * Handler for:
 *   POST /auth/resend-2fa
 *
 * Resends a 2FA verification code to the user's preferred delivery method.
 * Intended for the 2FA verification screen when the user did not receive
 * their initial code.
 *
 * Unlike check-2fa, this endpoint intentionally bypasses the 60-second
 * deduplication window so the user can request a fresh code on demand.
 * It enforces its own rate limit (RESEND_MAX_ATTEMPTS per window) to prevent
 * abuse / inbox flooding.
 *
 * Auth: none required — the user is mid-login and has no valid session token.
 *       Rate limiting is keyed on userId (hashed before storage).
 *
 * Request body:
 *   {
 *     userId : string            – Firebase UID of the mid-login user
 *     method?: 'email' | 'sms'  – delivery method; falls back to saved settings
 *   }
 *
 * Success response:
 *   { success: true, message: string }
 *
 * Error responses:
 *   429  { success: false, errorCode: 'RESEND_RATE_LIMITED', error: string }
 *   400  { success: false, error: string }
 *   500  { success: false, error: string }
 */

import { db } from '../../../shared/db.js';
import { hashUserId } from '../../../shared/hashUtils.js';
import { insertVerificationCode } from '../../../shared/encryptedQueries.js';
import { generate6DigitCode } from '../../../shared/authUtils.js';
import { send2FACodeEmail } from '../../../shared/emailService.js';
import { resolveLocaleFromRequest } from '../../../shared/email/i18n/index.js';
import { validationError, serverError, successResponse } from '../../../utils/responses.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { getUserEmail } from './helpers.js';

// ── Rate-limit constants ───────────────────────────────────────────────────
// Maximum number of resend requests allowed per window.
const RESEND_MAX_ATTEMPTS = 3;
// Window length in minutes over which attempts are counted.
const RESEND_WINDOW_MINUTES = 10;

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST /auth/resend-2fa
 *
 * Generates a fresh 6-digit verification code and dispatches it to the
 * user's preferred 2FA method.
 */
export async function resend2FAHandler(req, res) {
  try {
    const { userId, method } = req.body;

    if (!userId) return validationError(res, 'userId is required');

    const userIdHash = hashUserId(userId);

    // ── Rate limiting ────────────────────────────────────────────────────────
    // Count verification codes created for this user in the last 10 minutes.
    // Each resend call (and the original check-2fa call) creates one row.
    const recentResult = await db.query(
      `SELECT COUNT(*) AS count
       FROM verification_codes
       WHERE user_id_hash = $1
         AND created_at > NOW() - INTERVAL '10 minutes'`,
      [userIdHash],
    );
    const recentCount = parseInt(recentResult.rows[0]?.count ?? '0', 10);

    if (recentCount >= RESEND_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: `Too many resend attempts. Please wait ${RESEND_WINDOW_MINUTES} minutes before trying again.`,
        errorCode: 'RESEND_RATE_LIMITED',
      });
    }

    // ── Resolve user email ───────────────────────────────────────────────────
    const userEmail = await getUserEmail(userId);
    if (!userEmail) {
      return validationError(res, 'User not found');
    }

    // ── Determine delivery method ────────────────────────────────────────────
    // Prefer the method passed in the request body; fall back to the user's
    // saved 2FA settings; default to 'email' if no settings exist.
    let resolvedMethod = method;
    if (!resolvedMethod) {
      const settingsResult = await db.query(
        'SELECT method FROM user_2fa_settings WHERE user_id_hash = $1',
        [userIdHash],
      );
      resolvedMethod = settingsResult.rows[0]?.method ?? 'email';
    }

    // ── Send the code ────────────────────────────────────────────────────────

    if (resolvedMethod === 'email') {
      const code = generate6DigitCode();

      try {
        await insertVerificationCode(db, userId, userEmail, null, code, 'email');
      } catch (dbErr) {
        logErrorFromCatch(dbErr, 'resend-2fa', 'insertVerificationCode');
        return serverError(res, 'Failed to save 2FA code');
      }

      const sendResult = await send2FACodeEmail(
        userEmail,
        code,
        resolveLocaleFromRequest(req),
      );
      if (!sendResult?.success) {
        return serverError(res, 'Failed to send 2FA code via email');
      }

      return successResponse(res, {
        success: true,
        message: '2FA code re-sent to your email',
      });
    }

    // SMS is currently pending AWS carrier approval — return a clear message
    // rather than silently failing.
    return res.status(400).json({
      success: false,
      error: 'SMS resend is not currently available. Please use email verification.',
      errorCode: 'SMS_NOT_AVAILABLE',
    });
  } catch (error) {
    logErrorFromCatch(error, 'resend-2fa', 'resend2FAHandler');
    return serverError(res, `Failed to resend 2FA code: ${error.message}`);
  }
}
