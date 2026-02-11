import { verifyUserHash } from '../shared/hashUtils.js';
import logger from '../shared/logger.js';
import { authError, forbiddenError } from '../utils/responses.js';

/**
 * Middleware to validate hashed user IDs in URLs
 * Prevents user enumeration attacks by ensuring only authenticated users
 * can access other users' data (and then, only if authorized)
 * 
 * Usage: app.use(validateUserHash) or router.use(validateUserHash)
 */
export function validateUserHash(req, res, next) {
  console.log('[HASH-VALIDATION] Middleware called:', {
    path: req.path,
    method: req.method,
    hasUserId: !!req.params.userId,
    userId: req.params.userId?.substring(0, 16) + '...'
  });
  
  // Only check routes that have a userId parameter
  if (!req.params.userId) {
    console.log('[HASH-VALIDATION] No userId param, skipping validation');
    return next();
  }

  // Get the hashed ID from URL
  const hashedId = req.params.userId;

  // Get the real user ID from JWT (set by authenticateToken middleware)
  const jwtUserId = req.user?.userId || req.userId;

  if (!jwtUserId) {
    console.log('[HASH-VALIDATION] No JWT user ID found - req.user:', req.user);
    return authError(res,  'Unauthorized' );
  }

  // Verify that the hashed ID matches the JWT user ID
  const isValid = verifyUserHash(jwtUserId, hashedId);
  console.log('[HASH-VALIDATION] Verifying hash:', {
    jwtUserId: jwtUserId.substring(0, 8) + '...',
    hashedId: hashedId.substring(0, 16) + '...',
    isValid
  });
  
  if (!isValid) {
    console.log('[HASH-VALIDATION] Hash validation failed - access denied');
    return forbiddenError(res, 'Access denied' );
  }

  console.log('[HASH-VALIDATION] Hash valid, replacing with real userId');
  // Hash is valid - replace the hashed param with the real user ID for downstream handlers
  req.params.userId = jwtUserId;
  req.user = req.user || {};
  req.user.userId = jwtUserId;

  next();
}

export default validateUserHash;

