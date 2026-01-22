/**
 * Admin Authentication Middleware
 * Checks if authenticated user has admin privileges
 */

import { logErrorFromCatch } from '../shared/errorLogger.js';
import { authError, forbiddenError, serverError } from '../utils/responses.js';

// Load admin emails from environment variable
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || [];

/**
 * Middleware to verify user is an admin
 * Requires authenticateToken middleware to run first
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export function requireAdmin(req, res, next) {
  try {
    // Check if user is authenticated (req.user should be set by authenticateToken middleware)
    if (!req.user) {
      return authError(res, 'Authentication required');
    }

    const userEmail = req.user.email?.toLowerCase();

    if (!userEmail) {
      return forbiddenError(res, 'User email not found');
    }

    // Check if user email is in admin list
    if (!ADMIN_EMAILS.includes(userEmail)) {
      logErrorFromCatch(
        new Error(`Unauthorized admin access attempt by ${userEmail}`),
        'admin-auth',
        'Non-admin user attempted to access admin endpoint'
      );
      
      return forbiddenError(res, 'Admin access required');
    }

    // User is admin - proceed
    next();
  } catch (err) {
    logErrorFromCatch(err, 'admin-auth', 'Error in requireAdmin middleware');
    return serverError(res, 'Internal server error');
  }
}

/**
 * Check if email is admin (utility function)
 * @param {string} email - Email to check
 * @returns {boolean} True if email is admin
 */
export function isAdmin(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Get list of admin emails (for debugging/testing)
 * @returns {string[]} Array of admin emails
 */
export function getAdminEmails() {
  return [...ADMIN_EMAILS];
}

export default {
  requireAdmin,
  isAdmin,
  getAdminEmails
};
