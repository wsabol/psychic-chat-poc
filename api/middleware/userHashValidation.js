import { verifyUserHash } from '../shared/hashUtils.js';
import logger from '../shared/logger.js';

/**
 * Middleware to validate hashed user IDs in URLs
 * Prevents user enumeration attacks by ensuring only authenticated users
 * can access other users' data (and then, only if authorized)
 * 
 * Usage: app.use(validateUserHash) or router.use(validateUserHash)
 */
export function validateUserHash(req, res, next) {
  // Only check routes that have a userId parameter
  if (!req.params.userId) {
    return next();
  }

  // Get the hashed ID from URL
  const hashedId = req.params.userId;

  // Get the real user ID from JWT (set by authenticateToken middleware)
  const jwtUserId = req.user?.userId || req.userId;

  if (!jwtUserId) {
    return authError(res,  'Unauthorized' );
  }

  // Verify that the hashed ID matches the JWT user ID
  if (!verifyUserHash(jwtUserId, hashedId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Hash is valid - replace the hashed param with the real user ID for downstream handlers
  req.params.userId = jwtUserId;
  req.user = req.user || {};
  req.user.userId = jwtUserId;

  next();
}

export default validateUserHash;

