/**
 * errorLogger.js - Centralized Error Logging Service
 * 
 * Logs errors to error_logs database table with encryption
 * Used for debugging in production without exposing sensitive details to clients
 * 
 * Features:
 * - Encrypts sensitive data (stack traces, IPs)
 * - Logs service, severity, user, and context
 * - Tracks for admin dashboard and error reports
 * - Safe to call - won't crash app if database fails
 */

import { db } from './db.js';

/**
 * Log error to database
 * @param {Object} errorInfo - Error logging information
 * @param {string} errorInfo.service - Service that threw error ('auth', 'chat', 'horoscope', etc)
 * @param {string} errorInfo.errorMessage - Safe error message (NO internal details)
 * @param {string} errorInfo.severity - 'error' (default), 'warning', or 'critical'
 * @param {string} errorInfo.userIdHash - Optional: hashed user ID for user-specific errors
 * @param {string} errorInfo.context - Optional: what was user doing? ('login attempt', 'horoscope gen')
 * @param {string} errorInfo.errorStack - Optional: full error.stack (gets encrypted)
 * @param {string} errorInfo.ipAddress - Optional: user IP (gets encrypted)
 */
export async function logErrorToDB({
  service,
  errorMessage,
  severity = 'error',
  userIdHash = null,
  context = null,
  errorStack = null,
  ipAddress = null
}) {
  try {
    // Validate required fields
    if (!service || !errorMessage) {
      console.error('[ERROR-LOGGER] Missing required fields: service and errorMessage');
      return;
    }

    // Validate severity
    const validSeverities = ['error', 'warning', 'critical'];
    const finalSeverity = validSeverities.includes(severity) ? severity : 'error';

    // Build dynamic query based on what fields are provided
    let query = `
      INSERT INTO error_logs 
      (service, error_message, severity, user_id_hash, context, error_stack_encrypted, ip_address_encrypted)
      VALUES ($1, $2, $3, $4, $5, 
              ${errorStack ? 'pgp_sym_encrypt($6, $7)' : 'NULL'},
              ${ipAddress ? (errorStack ? 'pgp_sym_encrypt($8, $7)' : 'pgp_sym_encrypt($8, $7)') : 'NULL'})
    `;

    // Build params array
    let params = [service, errorMessage, finalSeverity, userIdHash, context];
    
    if (errorStack) {
      params.push(errorStack);
      params.push(process.env.ENCRYPTION_KEY);
    }
    if (ipAddress) {
      params.push(ipAddress);
      if (!errorStack) params.push(process.env.ENCRYPTION_KEY);
    }

    // Execute query
    await db.query(query, params);

    // Log locally for visibility during development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ERROR-LOG] ${service} | ${finalSeverity} | ${errorMessage}`);
    }

  } catch (dbError) {
    // CRITICAL: Never crash the app because of error logging failure
    // This is a safety net - log to console and continue
    console.error(
      '[ERROR-LOGGER] Failed to write to error_logs table:',
      dbError.message
    );
    // Don't rethrow - let the app continue
  }
}

/**
 * Convenience function: log error from catch block
 * Automatically extracts message and stack
 * 
 * Usage:
 * } catch (error) {
 *   await logErrorFromCatch(error, 'auth', 'User login attempt');
 *   return serverError(res, 'Login failed');
 * }
 */
export async function logErrorFromCatch(
  error,
  service,
  context = null,
  userIdHash = null,
  ipAddress = null,
  severity = 'error'
) {
  try {
    // Extract safe message (first line of error)
    const errorMessage = (error?.message || 'Unknown error').split('\n')[0].substring(0, 500);

    await logErrorToDB({
      service,
      errorMessage,
      severity,
      userIdHash,
      context,
      errorStack: error?.stack,
      ipAddress
    });
  } catch (logError) {
    console.error('[ERROR-LOGGER] Failed in logErrorFromCatch:', logError.message);
  }
}

/**
 * Log warning (non-critical issue)
 */
export async function logWarning({
  service,
  message,
  context = null,
  userIdHash = null
}) {
  await logErrorToDB({
    service,
    errorMessage: message,
    severity: 'warning',
    userIdHash,
    context
  });
}

/**
 * Log critical error (requires immediate attention)
 */
export async function logCritical({
  service,
  errorMessage,
  context = null,
  userIdHash = null,
  errorStack = null
}) {
  await logErrorToDB({
    service,
    errorMessage,
    severity: 'critical',
    userIdHash,
    context,
    errorStack
  });
}
