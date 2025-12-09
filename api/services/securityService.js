/**
 * Main Security Service Orchestrator
 * 
 * Imports and re-exports functions from modular service files:
 * - Device management (devices, sessions)
 * - Phone management (primary + recovery phone)
 * - Email management (recovery email)
 * - 2FA settings & session preferences
 * - Verification methods (combined view)
 * - Password operations
 * 
 * This allows routes to continue importing from this single file
 * while keeping implementation organized in focused modules.
 */

// Device Management
export { getDevices, logoutDevice } from './security/deviceService.js';

// Phone Management
export { getPhoneData, savePhoneNumber, verifyPhoneCode } from './security/phoneService.js';

// Email Management
export { getEmailData, saveRecoveryEmail, verifyEmailCode, removeRecoveryEmail } from './security/emailService.js';

// 2FA & Session Settings
export { get2FASettings, update2FASettings, updateSessionPreference } from './security/twoFAService.js';

// Verification Methods (Combined View)
export { getVerificationMethods } from './security/verificationService.js';

// Password Operations
export { recordPasswordChange } from './security/passwordService.js';
