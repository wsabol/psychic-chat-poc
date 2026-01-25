import { validate6DigitCode } from '../../shared/authUtils.js';
import { SECURITY_CONFIG } from '../../config/security.js';

/**
 * Security/2FA Validators
 * Validation functions for 2FA and security-related inputs
 */

/**
 * Validate verification code format
 * @param {string} code - Code to validate
 * @returns {Object} Validation result with isValid boolean and error message
 */
export function validateCodeFormat(code) {
  if (!code) {
    return { isValid: false, error: 'Code is required' };
  }

  if (typeof code !== 'string') {
    return { isValid: false, error: 'Code must be a string' };
  }

  if (!validate6DigitCode(code)) {
    return { isValid: false, error: 'Code must be exactly 6 digits' };
  }

  return { isValid: true };
}

/**
 * Validate device information object
 * @param {Object} deviceInfo - Device information to validate
 * @returns {Object} Validation result with isValid boolean and error message
 */
export function validateDeviceInfo(deviceInfo) {
  if (!deviceInfo || typeof deviceInfo !== 'object') {
    return { isValid: false, error: 'Device information is required' };
  }

  const { userAgent, ipAddress } = deviceInfo;

  if (!userAgent || typeof userAgent !== 'string') {
    return { isValid: false, error: 'Valid user agent is required' };
  }

  if (userAgent.length < 10) {
    return { isValid: false, error: 'User agent appears invalid' };
  }

  // IP address is optional but if provided should be validated
  if (ipAddress && typeof ipAddress !== 'string') {
    return { isValid: false, error: 'IP address must be a string' };
  }

  return { isValid: true };
}

/**
 * Validate trust duration
 * @param {number} durationDays - Number of days to trust device
 * @returns {Object} Validation result with isValid boolean and error message
 */
export function validateTrustDuration(durationDays) {
  if (durationDays === undefined || durationDays === null) {
    return { isValid: true }; // Use default
  }

  if (typeof durationDays !== 'number' || isNaN(durationDays)) {
    return { isValid: false, error: 'Trust duration must be a number' };
  }

  if (durationDays < 1) {
    return { isValid: false, error: 'Trust duration must be at least 1 day' };
  }

  if (durationDays > 365) {
    return { isValid: false, error: 'Trust duration cannot exceed 365 days' };
  }

  return { isValid: true };
}

/**
 * Validate verification method
 * @param {string} method - Verification method ('email' or 'sms')
 * @returns {Object} Validation result with isValid boolean and error message
 */
export function validateVerificationMethod(method) {
  if (!method) {
    return { isValid: false, error: 'Verification method is required' };
  }

  const validMethods = Object.values(SECURITY_CONFIG.VERIFICATION_METHODS);
  if (!validMethods.includes(method)) {
    return { 
      isValid: false, 
      error: `Invalid verification method. Must be one of: ${validMethods.join(', ')}` 
    };
  }

  return { isValid: true };
}

/**
 * Validate user ID format
 * @param {string} userId - User ID to validate
 * @returns {Object} Validation result with isValid boolean and error message
 */
export function validateUserId(userId) {
  if (!userId) {
    return { isValid: false, error: 'User ID is required' };
  }

  if (typeof userId !== 'string') {
    return { isValid: false, error: 'User ID must be a string' };
  }

  if (userId.length < 10) {
    return { isValid: false, error: 'User ID appears invalid' };
  }

  return { isValid: true };
}

/**
 * Validate email or phone number for code delivery
 * @param {string} destination - Email or phone number
 * @param {string} method - Verification method ('email' or 'sms')
 * @returns {Object} Validation result with isValid boolean and error message
 */
export function validateCodeDestination(destination, method) {
  if (!destination) {
    return { isValid: false, error: 'Destination is required' };
  }

  if (typeof destination !== 'string') {
    return { isValid: false, error: 'Destination must be a string' };
  }

  if (method === SECURITY_CONFIG.VERIFICATION_METHODS.EMAIL) {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destination)) {
      return { isValid: false, error: 'Invalid email address format' };
    }
  } else if (method === SECURITY_CONFIG.VERIFICATION_METHODS.SMS) {
    // Basic phone number validation (allows various formats)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(destination)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
  }

  return { isValid: true };
}

/**
 * Validate 2FA settings object
 * @param {Object} settings - 2FA settings to validate
 * @returns {Object} Validation result with isValid boolean and error message
 */
export function validate2FASettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { isValid: false, error: '2FA settings must be an object' };
  }

  const { enabled, method } = settings;

  // Validate enabled flag
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    return { isValid: false, error: 'enabled must be a boolean' };
  }

  // Validate method if provided
  if (method) {
    const methodValidation = validateVerificationMethod(method);
    if (!methodValidation.isValid) {
      return methodValidation;
    }
  }

  return { isValid: true };
}
