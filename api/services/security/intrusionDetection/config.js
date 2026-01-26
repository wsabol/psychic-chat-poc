/**
 * Intrusion Detection System Configuration
 * Centralized security thresholds and settings
 */

// Detection thresholds - can be overridden by environment variables
export const THRESHOLDS = {
  FAILED_LOGINS: parseInt(process.env.IDS_FAILED_LOGINS_THRESHOLD) || 5,
  FAILED_LOGINS_WINDOW: parseInt(process.env.IDS_FAILED_LOGINS_WINDOW) || 15, // minutes
  ACCOUNT_ENUMERATION: parseInt(process.env.IDS_ACCOUNT_ENUM_THRESHOLD) || 10,
  ENUMERATION_WINDOW: parseInt(process.env.IDS_ENUMERATION_WINDOW) || 30, // minutes
  RAPID_REQUESTS: parseInt(process.env.IDS_RAPID_REQUESTS_THRESHOLD) || 100, // per minute
  DATA_EXPORT_SIZE: parseInt(process.env.IDS_DATA_EXPORT_SIZE_MB) || 50, // MB
  UNUSUAL_TIME: process.env.IDS_UNUSUAL_TIME_CHECK === 'true',
  GEOGRAPHIC_ANOMALY: process.env.IDS_GEO_ANOMALY_CHECK === 'true',
  IMPOSSIBLE_TRAVEL: process.env.IDS_IMPOSSIBLE_TRAVEL_CHECK === 'true'
};

// Severity levels
export const SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Attempt types from database
export const ATTEMPT_TYPES = {
  FAILED: 'failed',
  SUCCESS: 'success'
};

export default {
  THRESHOLDS,
  SEVERITY,
  ATTEMPT_TYPES
};
