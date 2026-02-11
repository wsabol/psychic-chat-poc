/**
 * Intrusion Detection System (IDS)
 * Main entry point - exports all IDS functionality
 * 
 * Refactored for better maintainability:
 * - config.js: Configuration and thresholds
 * - queries.js: Database query helpers
 * - detectors.js: Threat detection logic
 * - metrics.js: Security metrics and scoring
 * - alerts.js: Alert management and notifications
 */

import * as detectors from './detectors.js';
import * as metrics from './metrics.js';
import * as alerts from './alerts.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

/**
 * Main anomaly detection engine
 * Runs all detection checks and raises alerts if threats found
 */
export async function detectAnomalies(event) {
  const anomalies = [];

  try {
    // Check each detection rule
    const bruteForce = await detectors.checkBruteForce(event.ipAddress);
    if (bruteForce.detected) anomalies.push(bruteForce);

    const enumeration = await detectors.checkAccountEnumeration(event.ipAddress);
    if (enumeration.detected) anomalies.push(enumeration);

    const rapidRequests = await detectors.checkRapidRequests(event.ipAddress);
    if (rapidRequests.detected) anomalies.push(rapidRequests);

    if (event.userId) {
      const geoAnomaly = await detectors.checkGeographicAnomaly(event.userId, event.ipAddress);
      if (geoAnomaly.detected) anomalies.push(geoAnomaly);

      const dataExport = await detectors.checkDataExport(event.userId, event.dataSize);
      if (dataExport.detected) anomalies.push(dataExport);
    }

    // If anomalies detected, raise alert
    if (anomalies.length > 0) {
      await alerts.raiseAlert(event, anomalies);
    }

    return anomalies;
  } catch (error) {
    logErrorFromCatch(error, 'intrusion-detection', 'detectAnomalies');
    return [];
  }
}

// Re-export all functions for backward compatibility
export { getSecurityMetrics, getIPSecurityScore } from './metrics.js';
export { blockIP, raiseAlert } from './alerts.js';
export {
  checkBruteForce,
  checkAccountEnumeration,
  checkRapidRequests,
  checkGeographicAnomaly,
  checkDataExport
} from './detectors.js';

// Export config for external access
export { THRESHOLDS, SEVERITY } from './config.js';

// Default export for module compatibility
export default {
  detectAnomalies,
  getSecurityMetrics: metrics.getSecurityMetrics,
  getIPSecurityScore: metrics.getIPSecurityScore,
  blockIP: alerts.blockIP,
  raiseAlert: alerts.raiseAlert
};
