/**
 * adminIpService.js  —  Barrel re-export  (backward-compatible)
 *
 * This file used to contain all admin IP/device-trust logic in one place.
 * It has been refactored into three focused modules under services/security/:
 *
 *   adminAuthService.js        — isAdmin() + ADMIN_EMAILS constant
 *   adminIpTrustService.js     — IP-based trust (admin login bypass) + audit log
 *   adminDeviceTrustService.js — UA-keyed device trust (all users, settings page)
 *
 * This barrel keeps existing import paths working without changes.
 * New code should import directly from the specific sub-service.
 */

export * from './security/adminAuthService.js';
export * from './security/adminIpTrustService.js';
export * from './security/adminDeviceTrustService.js';
