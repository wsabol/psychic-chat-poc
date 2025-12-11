/**
 * Session Manager (Modular Wrapper)
 * 
 * This file re-exports from the modular sessionManager/ directory
 * for backward compatibility with existing code.
 * 
 * PREFERRED: import directly from ./sessionManager/index.js or specific services
 */

// Re-export all functions from modular structure
export {
  createSession,
  validateSession,
  getActiveSessions,
  revokeSession,
  revokeAllSessions
} from './sessionManager/index.js';

export {
  logLoginAttempt,
  getLoginAttempts,
  getAttemptsFromIp,
  countFailedAttemptsFromIp,
  countUniqueUsersFromIp
} from './sessionManager/index.js';

export {
  detectSuspiciousIP,
  detectSuspiciousUserActivity,
  shouldChallenge
} from './sessionManager/index.js';

// Backward compatibility alias: detectSuspiciousLogins -> detectSuspiciousIP
export { detectSuspiciousIP as detectSuspiciousLogins } from './sessionManager/index.js';

// Default export
import sessionManager from './sessionManager/index.js';
export default sessionManager;
