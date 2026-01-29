/**
 * Error Logger for Lambda Functions
 * 
 * Logs errors to CloudWatch Logs automatically (console.log in Lambda = CloudWatch)
 * Optionally logs to database for audit trail
 * 
 * Simplified for Lambda environment - AWS handles log aggregation
 */

import { db } from './db.js';

/**
 * Log error to console (CloudWatch) and optionally to database
 * @param {Error|string} error - Error object or message
 * @param {string} service - Service name (e.g., 'temp-account-cleanup')
 * @param {string} context - Additional context
 * @param {string|null} userId - Optional user ID for tracking
 * @param {Object|null} metadata - Additional metadata
 */
export async function logError(error, service, context = '', userId = null, metadata = null) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : null;
  
  // Log to CloudWatch (console.log in Lambda)
  console.error(`[${timestamp}] [${service}] ERROR:`, {
    message: errorMessage,
    context,
    userId,
    stack: errorStack,
    metadata
  });
  
  // Try to log to database for audit trail (non-blocking)
  try {
    await db.query(
      `INSERT INTO error_logs 
       (service, error_message, error_stack, context, user_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        service,
        errorMessage,
        errorStack,
        context,
        userId,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
  } catch (dbError) {
    // If database logging fails, just log to console
    console.error(`[${timestamp}] [ERROR-LOGGER] Failed to log to database:`, dbError.message);
  }
}

/**
 * Log error from catch block
 * Convenience wrapper for try/catch blocks
 * @param {Error} error - Error object from catch
 * @param {string} service - Service name
 * @param {string} context - Context where error occurred
 * @param {string|null} userId - Optional user ID
 */
export async function logErrorFromCatch(error, service, context = '', userId = null) {
  await logError(error, service, context, userId);
}

/**
 * Log warning (non-critical issues)
 * @param {Object} options - Warning options
 */
export async function logWarning({ service, message, context, metadata }) {
  const timestamp = new Date().toISOString();
  
  console.warn(`[${timestamp}] [${service}] WARNING:`, {
    message,
    context,
    metadata
  });
  
  // Optionally log warnings to database
  try {
    await db.query(
      `INSERT INTO error_logs 
       (service, error_message, context, metadata, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        service,
        message,
        context,
        metadata ? JSON.stringify(metadata) : null,
        'warning'
      ]
    );
  } catch (dbError) {
    console.warn(`[${timestamp}] [ERROR-LOGGER] Failed to log warning to database:`, dbError.message);
  }
}

/**
 * Log info message (for audit trail)
 * @param {string} service - Service name
 * @param {string} message - Info message
 * @param {Object|null} metadata - Additional metadata
 */
export function logInfo(service, message, metadata = null) {
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [${service}] INFO:`, {
    message,
    metadata
  });
}

/**
 * Log job execution summary
 * @param {string} jobName - Name of the job
 * @param {Object} stats - Job execution statistics
 * @param {number} duration - Duration in milliseconds
 */
export function logJobSummary(jobName, stats, duration) {
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [${jobName}] SUMMARY:`, {
    stats,
    duration: `${duration}ms`,
    durationSeconds: (duration / 1000).toFixed(2) + 's'
  });
}

/**
 * Create a logger instance for a specific service
 * @param {string} serviceName - Service name
 * @returns {Object} Logger instance
 */
export function createLogger(serviceName) {
  return {
    error: (error, context = '', userId = null, metadata = null) => 
      logError(error, serviceName, context, userId, metadata),
    
    errorFromCatch: (error, context = '', userId = null) => 
      logErrorFromCatch(error, serviceName, context, userId),
    
    warning: (message, context = '', metadata = null) => 
      logWarning({ service: serviceName, message, context, metadata }),
    
    info: (message, metadata = null) => 
      logInfo(serviceName, message, metadata),
    
    summary: (stats, duration) => 
      logJobSummary(serviceName, stats, duration)
  };
}

export default {
  logError,
  logErrorFromCatch,
  logWarning,
  logInfo,
  logJobSummary,
  createLogger
};
