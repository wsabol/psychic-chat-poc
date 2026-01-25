/**
 * User Ownership Verification Middleware
 * Ensures authenticated user can only access their own resources
 */

import { forbiddenError } from '../utils/responses.js';

/**
 * Middleware to verify that the authenticated user matches the userId parameter
 * @param {string} paramName - Name of the URL parameter containing userId (default: 'userId')
 */
export const verifyUserOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    const userId = req.params[paramName];
    
    if (!req.user || !req.user.uid) {
      return forbiddenError(res, 'Authentication required');
    }
    
    if (req.user.uid !== userId) {
      return forbiddenError(res, 'Unauthorized: You can only access your own resources');
    }
    
    next();
  };
};

export default verifyUserOwnership;
