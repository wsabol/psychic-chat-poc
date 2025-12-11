/**
 * Session Manager
 * Main orchestrator that exports all session-related functions
 * 
 * Modular structure:
 * - sessionService: Core session CRUD operations
 * - loginAttemptService: Login attempt tracking
 * - fraudDetectionService: Suspicious activity detection
 * - utils/sessionTokenizer: Token crypto operations
 * - utils/deviceParser: Device fingerprinting
 */

// Export session operations
export {
  createSession,
  validateSession,
  getActiveSessions,
  revokeSession,
  revokeAllSessions
} from './services/sessionService.js';

// Export login attempt tracking
export {
  logLoginAttempt,
  getLoginAttempts,
  getAttemptsFromIp,
  countFailedAttemptsFromIp,
  countUniqueUsersFromIp
} from './services/loginAttemptService.js';

// Export fraud detection
export {
  detectSuspiciousIP,
  detectSuspiciousUserActivity,
  shouldChallenge
} from './services/fraudDetectionService.js';

// Export utility functions
export {
  generateSessionToken,
  hashSessionToken,
  verifySessionToken
} from './utils/sessionTokenizer.js';

export {
  parseDeviceInfo,
  extractIpAddress
} from './utils/deviceParser.js';

// Default export for backward compatibility
import * as sessionService from './services/sessionService.js';
import * as loginAttemptService from './services/loginAttemptService.js';
import * as fraudDetectionService from './services/fraudDetectionService.js';
import * as sessionTokenizer from './utils/sessionTokenizer.js';
import * as deviceParser from './utils/deviceParser.js';

export default {
  // Services
  sessionService,
  loginAttemptService,
  fraudDetectionService,
  
  // Utils
  sessionTokenizer,
  deviceParser
};
