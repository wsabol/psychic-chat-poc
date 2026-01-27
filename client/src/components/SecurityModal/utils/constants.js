/**
 * SecurityModal Constants
 * Validation rules, labels, and configuration
 */

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

export const PASSWORD_STRENGTH_LEVELS = [
  { label: 'Very Weak', color: '#ff4444' },
  { label: 'Weak', color: '#ff9944' },
  { label: 'Fair', color: '#ffdd44' },
  { label: 'Good', color: '#99dd44' },
  { label: 'Strong', color: '#44aa44' },
];

export const TWO_FA_METHODS = {
  SMS: 'sms',
  EMAIL: 'email',
};

export const PHONE_NUMBER_REGEX = /^\+?[1-9]\d{1,14}$/; // E.164 format
