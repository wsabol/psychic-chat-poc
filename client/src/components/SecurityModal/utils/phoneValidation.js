/**
 * Phone number validation utilities
 */

import { PHONE_NUMBER_REGEX } from './constants';

/**
 * Basic phone number validation
 * Accepts formats like: +1234567890, (123) 456-7890, 123-456-7890
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid format
 */
export const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.trim() === '') return false;
  
  // Remove common formatting characters
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Check if it matches E.164 format or is a reasonable length
  return PHONE_NUMBER_REGEX.test(cleanNumber) || (cleanNumber.length >= 10 && cleanNumber.length <= 15);
};

/**
 * Format phone number for display
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as (123) 456-7890 for 10-digit US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format international numbers with country code
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  return phoneNumber;
};

/**
 * Validate phone number and return error message if invalid
 * @param {string} phoneNumber - Phone number to validate
 * @param {boolean} required - Whether the field is required
 * @returns {string|null} - Error message or null if valid
 */
export const validatePhoneNumber = (phoneNumber, required = false) => {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return required ? 'Phone number is required' : null;
  }
  
  if (!isValidPhoneNumber(phoneNumber)) {
    return 'Please enter a valid phone number';
  }
  
  return null;
};
