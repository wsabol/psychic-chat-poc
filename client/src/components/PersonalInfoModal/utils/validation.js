/**
 * Validation utilities for PersonalInfoModal
 * Centralized validation logic for better maintainability
 */

export function validatePersonalInfo(formData, isTemporaryAccount) {
  const errors = [];

  // Required fields for permanent accounts
  if (!isTemporaryAccount) {
    if (!formData.firstName?.trim()) {
      errors.push('First name is required');
    }
    if (!formData.lastName?.trim()) {
      errors.push('Last name is required');
    }
    if (!formData.sex) {
      errors.push('Sex is required');
    }
  }

  // Required for all accounts
  if (!formData.email?.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(formData.email)) {
    errors.push('Please enter a valid email address');
  }

  if (!formData.birthDate) {
    errors.push('Date of birth is required (format: dd-mmm-yyyy, dd mmm yyyy, or dd/mmm/yyyy)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeFormData(formData, isTemporaryAccount) {
  const sanitized = { ...formData };

  // Set defaults for temporary accounts
  if (isTemporaryAccount) {
    sanitized.firstName = sanitized.firstName || 'Seeker';
    sanitized.lastName = sanitized.lastName || 'Soul';
    sanitized.sex = sanitized.sex || 'Unspecified';
  }

  // Trim text fields
  if (sanitized.firstName) sanitized.firstName = sanitized.firstName.trim();
  if (sanitized.lastName) sanitized.lastName = sanitized.lastName.trim();
  if (sanitized.email) sanitized.email = sanitized.email.trim();
  if (sanitized.birthCity) sanitized.birthCity = sanitized.birthCity.trim();
  if (sanitized.birthProvince) sanitized.birthProvince = sanitized.birthProvince.trim();
  if (sanitized.addressPreference) sanitized.addressPreference = sanitized.addressPreference.trim();

  return sanitized;
}
