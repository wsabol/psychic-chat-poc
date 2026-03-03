import { auth } from '../shared/firebase-admin.js';
import logger from '../shared/logger.js';
import { authError, forbiddenError } from '../utils/responses.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

// Middleware to verify Firebase ID token
export async function authenticateToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return authError(res, 'Access token required' );
    }
    
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      userId: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };
    req.userId = decodedToken.uid;
    
    next();
        } catch (err) {
    // All Firebase token-verification errors are authentication failures (401),
    // not permission failures (403).  The client's fetchWithTokenRefresh already
    // handles 401 by fetching a fresh ID token and retrying, so returning 401
    // here gives the client the best chance of self-healing.
    //
    // Notable codes:
    //   auth/id-token-expired   – token past its exp claim (most common)
    //   auth/id-token-revoked   – refresh tokens explicitly revoked
    //   auth/argument-error     – malformed token (e.g. "Bearer undefined")
    //   auth/user-disabled      – Firebase user account disabled
    if (err.code === 'auth/id-token-expired') {
      // Token refresh is automatic and expected — no noise logging needed
      return authError(res, 'Token expired');
    }

    // Log unexpected auth errors (revoked, disabled, malformed) at a low level
    // so they are visible in error logs without spamming for normal expiry.
    // argument-error is noisy (happens on every "Bearer undefined" race condition)
    // so we intentionally skip logging for it.
    if (err.code !== 'auth/argument-error') {
      logErrorFromCatch(err, 'auth', `authenticateToken: ${err.code}`).catch(() => {});
    }

    return authError(res, 'Invalid token');
  }
}

// Middleware to verify user owns the resource they're accessing
export function authorizeUser(req, res, next) {
  const requestedUserId = req.params.userId;
  
  if (req.userId !== requestedUserId) {
    return forbiddenError(res, 'You can only access your own data');
  }
  
  next();
}
// Stub for compatibility (Firebase handles 2FA differently)
export function verify2FA(req, res, next) {
  // Firebase 2FA is handled by Firebase SDK, not by this middleware
  next();
}

