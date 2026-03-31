/**
 * Admin — Session Management
 *
 * Provides remote sign-out by revoking Firebase refresh tokens.
 * Once revoked, any attempt by the client to refresh an expired ID token
 * (which happens automatically in api.service.ts and useTokenRefresh) fails,
 * causing the mobile/web app to clear storage and sign the user out.
 *
 * The middleware/auth.js verifyIdToken call uses checkRevoked: true so that
 * revoked tokens are blocked immediately on the very next API call rather
 * than waiting up to 1 hour for the natural ID-token expiry.
 *
 * Endpoints:
 *   POST /admin/session-management/revoke-user/:userId   — one user by UID
 *   POST /admin/session-management/revoke-by-email        — one user by email
 *   POST /admin/session-management/revoke-all             — every non-admin user
 *
 * All endpoints require:
 *   • A valid admin Firebase ID token  (enforced by authenticateToken in index.js)
 *   • Admin email in ADMIN_EMAILS env var  (enforced by requireAdmin below)
 */

import { Router } from 'express';
import { auth } from '../../shared/firebase-admin.js';
import { db } from '../../shared/db.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { logAudit } from '../../shared/auditLog.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { serverError, successResponse, validationError } from '../../utils/responses.js';

const router = Router();

// Every route in this file requires admin privileges.
// authenticateToken is already applied at the /admin mount in index.js.
router.use(requireAdmin);

// ─── POST /admin/session-management/revoke-user/:userId ──────────────────────
// Revoke all Firebase sessions for a specific user identified by their Firebase UID.
// The user will be signed out on their very next API call once their current
// ID token is either rejected (checkRevoked: true) or expires.

router.post('/session-management/revoke-user/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return validationError(res, 'userId is required');

  try {
    await auth.revokeRefreshTokens(userId);

    await logAudit(db, {
      userId: req.user.userId,
      action: 'ADMIN_REVOKE_USER_SESSIONS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { revokedUserId: userId },
    });

    return successResponse(res, {
      success: true,
      revokedUserId: userId,
      message: 'Refresh tokens revoked. The user will be signed out on their next API call.',
    });
  } catch (err) {
    await logErrorFromCatch(err, 'admin', 'revoke-user-sessions', req.user?.userId);
    return serverError(res, 'Failed to revoke user sessions');
  }
});

// ─── POST /admin/session-management/revoke-by-email ──────────────────────────
// Convenience wrapper: look up the Firebase UID by email, then revoke.
// Body: { email: "user@example.com" }

router.post('/session-management/revoke-by-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return validationError(res, 'email is required');

  try {
    // Look up the Firebase user by email to get their UID.
    const firebaseUser = await auth.getUserByEmail(email);

    await auth.revokeRefreshTokens(firebaseUser.uid);

    await logAudit(db, {
      userId: req.user.userId,
      action: 'ADMIN_REVOKE_USER_SESSIONS_BY_EMAIL',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { revokedEmail: email, revokedUserId: firebaseUser.uid },
    });

    return successResponse(res, {
      success: true,
      revokedUserId: firebaseUser.uid,
      revokedEmail: email,
      message: 'Refresh tokens revoked. The user will be signed out on their next API call.',
    });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      return validationError(res, `No Firebase user found with email: ${email}`);
    }
    await logErrorFromCatch(err, 'admin', 'revoke-sessions-by-email', req.user?.userId);
    return serverError(res, 'Failed to revoke user sessions');
  }
});

// ─── POST /admin/session-management/revoke-all ───────────────────────────────
// Revoke Firebase sessions for ALL non-admin users.
//
// Safety gate: the caller must include the header
//   X-Confirm-Revoke-All: REVOKE_ALL_SESSIONS
// to prevent accidental mass sign-outs.
//
// Users are loaded from user_personal_info (our DB is the source of truth for
// registered UIDs) rather than Firebase's listUsers() pagination to avoid
// Firebase rate-limiting on large user bases.
//
// Revocation is done in parallel batches of 20.  Any individual failure is
// collected and reported without aborting the rest.

router.post('/session-management/revoke-all', async (req, res) => {
  // ── Safety confirmation ────────────────────────────────────────────────────
  const confirm = req.headers['x-confirm-revoke-all'];
  if (confirm !== 'REVOKE_ALL_SESSIONS') {
    return validationError(
      res,
      'Add the header X-Confirm-Revoke-All: REVOKE_ALL_SESSIONS to confirm mass revocation.',
    );
  }

  try {
    // Load all non-admin Firebase UIDs from our DB.
    const result = await db.query(
      `SELECT user_id FROM user_personal_info WHERE is_admin IS DISTINCT FROM TRUE`,
    );

    const userIds = result.rows.map(r => r.user_id);

    let revoked = 0;
    let failed  = 0;
    const failures = [];

    // Revoke in batches of 20 to avoid overwhelming Firebase.
    const BATCH_SIZE = 20;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(uid =>
          auth.revokeRefreshTokens(uid)
            .then(() => { revoked++; })
            .catch(err => {
              failed++;
              failures.push({ uid, error: err.message });
            }),
        ),
      );
    }

    await logAudit(db, {
      userId: req.user.userId,
      action: 'ADMIN_REVOKE_ALL_SESSIONS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      details: { total: userIds.length, revoked, failed },
    });

    return successResponse(res, {
      success: true,
      message:
        'Mass session revocation complete. All affected users will be signed out on their next API call.',
      stats: { total: userIds.length, revoked, failed },
      ...(failures.length > 0 && { failures }),
    });
  } catch (err) {
    await logErrorFromCatch(err, 'admin', 'revoke-all-sessions', req.user?.userId);
    return serverError(res, 'Failed to execute mass session revocation');
  }
});

export default router;
