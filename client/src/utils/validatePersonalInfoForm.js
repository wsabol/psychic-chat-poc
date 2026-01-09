import { validateBirthDate } from './dateValidator';

/**
 * Validate personal info form data
 * @param {Object} formData - Form data object with all fields
 * @param {boolean} isTemporaryAccount - Whether user is on temporary account
 * @param {Function} t - Translation function
 * @returns {Object} { isValid: boolean, errors: {} }
 */
export function validatePersonalInfoForm(formData, isTemporaryAccount, t) {
  const errors = {};

  // Required fields for non-temporary accounts
  if (!isTemporaryAccount) {
    if (!formData.firstName.trim()) {
      errors.firstName = t('personalInfo.errors.missingRequired');
    }
    if (!formData.lastName.trim()) {
      errors.lastName = t('personalInfo.errors.missingRequired');
    }
    if (!formData.sex) {
      errors.sex = t('personalInfo.errors.missingRequired');
    }
  }

  // Always required fields
  if (!formData.email.trim()) {
    errors.email = t('personalInfo.errors.missingRequired');
  }

  // Validate birth date
  if (!formData.birthDate) {
    errors.birthDate = t('personalInfo.errors.invalidBirthDate');
  } else {
    const dateValidation = validateBirthDate(formData.birthDate);
    if (!dateValidation.isValid) {
      errors.birthDate = dateValidation.error;
    } else if (!dateValidation.isAdult) {
      errors.birthDate = dateValidation.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
