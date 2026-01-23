/**
 * Preferences Validator
 * Validation logic for user preferences
 */

import {
  VALID_LANGUAGES,
  VALID_ORACLE_LANGUAGES,
  VALID_RESPONSE_TYPES,
  VALID_VOICES
} from '../constants/userConstants.js';

/**
 * Validate language code
 * @param {string} language - Language code
 * @returns {Object} Validation result { valid, error }
 */
export function validateLanguage(language) {
  if (!VALID_LANGUAGES.includes(language)) {
    return { valid: false, error: `Invalid language: ${language}` };
  }
  return { valid: true };
}

/**
 * Validate response type
 * @param {string} responseType - Response type
 * @returns {Object} Validation result { valid, error }
 */
export function validateResponseType(responseType) {
  if (!VALID_RESPONSE_TYPES.includes(responseType)) {
    return { valid: false, error: `Invalid response_type: ${responseType}` };
  }
  return { valid: true };
}

/**
 * Validate oracle language code
 * @param {string} oracleLanguage - Oracle language code
 * @returns {Object} Validation result { valid, error }
 */
export function validateOracleLanguage(oracleLanguage) {
  if (!VALID_ORACLE_LANGUAGES.includes(oracleLanguage)) {
    return { valid: false, error: `Invalid oracle_language: ${oracleLanguage}` };
  }
  return { valid: true };
}

/**
 * Validate voice selection
 * @param {string} voice - Voice name
 * @returns {boolean} True if valid
 */
export function isValidVoice(voice) {
  return VALID_VOICES.includes(voice);
}

/**
 * Get default oracle language based on primary language
 * @param {string} language - Primary language code
 * @returns {string} Default oracle language
 */
export function getDefaultOracleLanguage(language) {
  return VALID_ORACLE_LANGUAGES.includes(language) ? language : 'en-US';
}

/**
 * Get default or validated voice
 * @param {string} voice - Voice selection
 * @returns {string} Valid voice name
 */
export function getValidatedVoice(voice) {
  return isValidVoice(voice) ? voice : 'sophia';
}
