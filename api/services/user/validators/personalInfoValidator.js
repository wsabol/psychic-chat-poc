/**
 * Personal Information Validator
 * Validation logic for personal information fields
 *
 * NOTE: First name, last name, and email are no longer validated here.
 *   - first_name_encrypted and last_name_encrypted have been dropped from the DB.
 *   - Email is taken from the verified Firebase auth token (req.user.email),
 *     not from the form, so it is always present and already validated.
 */

import { validateAge } from '../../../shared/ageValidator.js';
import { handleAgeViolation } from '../../../shared/violationHandler.js';
import { parseDateForStorage } from '../../../shared/validationUtils.js';

/**
 * Sanitize optional personal info fields
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized fields
 */
export function sanitizeOptionalFields(data) {
  const { birthTime, birthCountry, birthProvince, birthCity, birthTimezone, addressPreference } = data;

  return {
    birthTime:         birthTime        && birthTime.trim()        ? birthTime        : null,
    birthCountry:      birthCountry     && birthCountry.trim()     ? birthCountry     : null,
    birthProvince:     birthProvince    && birthProvince.trim()    ? birthProvince    : null,
    birthCity:         birthCity        && birthCity.trim()        ? birthCity        : null,
    birthTimezone:     birthTimezone    && birthTimezone.trim()    ? birthTimezone    : null,
    addressPreference: addressPreference && addressPreference.trim() ? addressPreference : null,
  };
}

/**
 * Validate required fields for personal information.
 * Only birthDate is required; email comes from the Firebase token, and
 * first/last names are no longer stored.
 *
 * @param {Object} data - Personal information
 * @returns {Object} Validation result { valid, error }
 */
export function validatePersonalInfoFields(data) {
  const { birthDate } = data;

  if (!birthDate) {
    return { valid: false, error: 'Missing required field: birthDate' };
  }

  return { valid: true };
}

/**
 * Validate and parse birth date
 * @param {string} birthDate - Birth date string
 * @returns {Object} Validation result { valid, parsedDate, error }
 */
export function validateBirthDate(birthDate) {
  const parsedBirthDate = parseDateForStorage(birthDate);

  if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
    return { valid: false, error: 'Invalid birth date format' };
  }

  return { valid: true, parsedDate: parsedBirthDate };
}

/**
 * Validate and handle age requirements
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Validation result { valid, error, accountDeleted }
 */
export async function validateUserAge(birthDate, userId) {
  const ageValidation = validateAge(birthDate);

  if (!ageValidation.isValid) {
    return {
      valid: false,
      error: ageValidation.error + ' (This app requires users to be 18 years or older)',
    };
  }

  // Handle age violation if user is under 18
  if (!ageValidation.isAdult) {
    const violationResult = await handleAgeViolation(userId, ageValidation.age);
    return {
      valid: false,
      error: violationResult.error || violationResult.message,
      accountDeleted: violationResult.deleted,
    };
  }

  return { valid: true };
}

/**
 * Check if birth chart calculation should be enqueued
 * @param {Object} sanitizedFields - Sanitized optional fields
 * @param {string} birthDate - Birth date
 * @returns {boolean} True if full birth chart data is available
 */
export function shouldEnqueueBirthChart(sanitizedFields, birthDate) {
  const { birthTime, birthCountry, birthProvince, birthCity } = sanitizedFields;
  return !!(birthTime && birthCountry && birthProvince && birthCity && birthDate);
}
