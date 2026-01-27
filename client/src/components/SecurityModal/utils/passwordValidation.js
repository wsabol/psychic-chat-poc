/**
 * Password validation utilities
 * Extracted from SecurityModal to make testable and reusable
 */

import { PASSWORD_REQUIREMENTS, PASSWORD_STRENGTH_LEVELS } from './constants';

/**
 * Check password strength based on multiple criteria
 * @param {string} password - Password to check
 * @returns {number} - Strength score from 0-4
 */
export const checkPasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= PASSWORD_REQUIREMENTS.minLength) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
  
  return strength;
};

/**
 * Get password strength label and color
 * @param {number} strength - Strength score (0-4)
 * @returns {Object} - { label: string, color: string }
 */
export const getPasswordStrengthLabel = (strength) => {
  return PASSWORD_STRENGTH_LEVELS[strength] || PASSWORD_STRENGTH_LEVELS[0];
};

/**
 * Get array of password requirements with their status
 * @param {string} password - Password to validate
 * @returns {Array} - Array of { met: boolean, label: string }
 */
export const getPasswordRequirements = (password) => {
  return [
    {
      met: password.length >= PASSWORD_REQUIREMENTS.minLength,
      label: `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    },
    {
      met: /[A-Z]/.test(password),
      label: 'One uppercase letter',
    },
    {
      met: /[0-9]/.test(password),
      label: 'One number',
    },
    {
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      label: 'One special character',
    },
  ];
};

/**
 * Validate password meets all requirements
 * @param {string} password - Password to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validatePassword = (password) => {
  const requirements = getPasswordRequirements(password);
  const unmetRequirements = requirements.filter(req => !req.met);
  
  if (unmetRequirements.length > 0) {
    return `Password must meet all requirements`;
  }
  
  return null;
};

/**
 * Check if passwords match
 * @param {string} password - First password
 * @param {string} confirmPassword - Confirmation password
 * @returns {boolean} - True if they match
 */
export const passwordsMatch = (password, confirmPassword) => {
  return password === confirmPassword && password.length > 0;
};
