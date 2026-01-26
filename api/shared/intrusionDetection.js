/**
 * DEPRECATED: This file has been refactored and moved to:
 * api/services/security/intrusionDetection/
 * 
 * New modular structure:
 * - config.js: Configuration and thresholds
 * - queries.js: Database query helpers  
 * - detectors.js: Threat detection logic
 * - metrics.js: Security metrics and scoring
 * - alerts.js: Alert management and notifications
 * - index.js: Main exports
 * 
 * This file now re-exports from the new location for backward compatibility.
 * Please update imports to use:
 * import { ... } from '../services/security/intrusionDetection/index.js';
 * 
 * @deprecated Use api/services/security/intrusionDetection/index.js instead
 */

// Re-export everything from the new location
export {
  detectAnomalies,
  getSecurityMetrics,
  getIPSecurityScore,
  blockIP,
  raiseAlert,
  checkBruteForce,
  checkAccountEnumeration,
  checkRapidRequests,
  checkGeographicAnomaly,
  checkDataExport,
  THRESHOLDS,
  SEVERITY
} from '../services/security/intrusionDetection/index.js';

// Default export for backward compatibility
import intrusionDetection from '../services/security/intrusionDetection/index.js';
export default intrusionDetection;
