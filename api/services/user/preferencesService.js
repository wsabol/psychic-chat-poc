/**
 * Preferences Service
 * Business logic for user preferences management
 */

import { hashUserId } from '../../shared/hashUtils.js';
import { DEFAULT_PREFERENCES } from './constants/userConstants.js';
import {
  validateLanguage,
  validateResponseType,
  validateOracleLanguage,
  getDefaultOracleLanguage,
  getValidatedVoice
} from './validators/preferencesValidator.js';
import {
  findPreferencesByUserIdHash,
  upsertTimezone as saveTimezone,
  upsertLanguagePreferences as saveLanguagePrefs,
  upsertFullPreferences as saveFullPrefs
} from './repositories/preferencesRepository.js';

/**
 * Get user preferences
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User preferences with defaults
 */
export async function getUserPreferences(userId) {
  const userIdHash = hashUserId(userId);
  const preferences = await findPreferencesByUserIdHash(userIdHash);
  
  return preferences || DEFAULT_PREFERENCES;
}

/**
 * Update timezone only
 * @param {string} userId - User ID
 * @param {string} timezone - Timezone string
 * @returns {Promise<Object>} Result
 */
export async function updateTimezone(userId, timezone) {
  const userIdHash = hashUserId(userId);
  await saveTimezone(userIdHash, timezone);

  return { success: true, message: 'Timezone saved successfully', timezone };
}

/**
 * Update language preferences (temp user flow)
 * @param {string} userId - User ID
 * @param {Object} preferences - Language preferences
 * @returns {Promise<Object>} Result
 */
export async function updateLanguagePreferences(userId, preferences) {
  const { language, response_type, voice_enabled, timezone, oracle_language } = preferences;

  // Validate language
  const langValidation = validateLanguage(language);
  if (!langValidation.valid) {
    return { success: false, error: langValidation.error };
  }

  // Validate response type
  const responseValidation = validateResponseType(response_type);
  if (!responseValidation.valid) {
    return { success: false, error: responseValidation.error };
  }

  // Validate oracle language
  const oracleValidation = validateOracleLanguage(oracle_language);
  if (!oracleValidation.valid) {
    return { success: false, error: oracleValidation.error };
  }

  const userIdHash = hashUserId(userId);
  const savedPreferences = await saveLanguagePrefs(userIdHash, {
    language,
    response_type,
    voice_enabled: voice_enabled !== false,
    timezone,
    oracle_language
  });

  return { success: true, preferences: savedPreferences };
}

/**
 * Update full preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Full preferences
 * @returns {Promise<Object>} Result
 */
export async function updateFullPreferences(userId, preferences) {
  const { language, response_type, voice_enabled, voice_selected, timezone, oracle_language } = preferences;

  // Validate language
  const langValidation = validateLanguage(language);
  if (!langValidation.valid) {
    return { success: false, error: 'Invalid language' };
  }

  // Validate response type
  const responseValidation = validateResponseType(response_type);
  if (!responseValidation.valid) {
    return { success: false, error: 'Invalid response_type' };
  }

  // Get validated/default values
  const selectedOracleLanguage = getDefaultOracleLanguage(oracle_language || language);
  const selectedVoice = getValidatedVoice(voice_selected);

  const userIdHash = hashUserId(userId);
  const savedPreferences = await saveFullPrefs(userIdHash, {
    language,
    response_type,
    voice_enabled: voice_enabled !== false,
    voice_selected: selectedVoice,
    timezone,
    oracle_language: selectedOracleLanguage
  });

  return { success: true, preferences: savedPreferences };
}
