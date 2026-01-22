/**
 * User Profile Service
 * Business logic for user profile and preferences management
 */

import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import { validateAge } from '../shared/ageValidator.js';
import { handleAgeViolation } from '../shared/violationHandler.js';
import { calculateSunSignFromDate } from '../shared/zodiacUtils.js';
import { enqueueMessage } from '../shared/queue.js';
import { parseDateForStorage } from '../shared/validationUtils.js';

// Validation constants
const VALID_LANGUAGES = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'es-DO', 
  'fr-FR', 'fr-CA', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'
];

const VALID_ORACLE_LANGUAGES = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'es-DO', 'fr-FR', 'fr-CA'
];

const VALID_RESPONSE_TYPES = ['full', 'brief'];

const VALID_VOICES = ['sophia', 'cassandra', 'meridian', 'leo'];

const DEFAULT_PREFERENCES = {
  language: 'en-US',
  response_type: 'full',
  voice_enabled: true,
  voice_selected: 'sophia',
  timezone: null,
  oracle_language: 'en-US'
};

/**
 * Get user personal information
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Decrypted personal information
 */
export async function getPersonalInfo(userId) {
  const { rows } = await db.query(
    `SELECT 
      pgp_sym_decrypt(first_name_encrypted, $1) as first_name,
      pgp_sym_decrypt(last_name_encrypted, $1) as last_name,
      pgp_sym_decrypt(email_encrypted, $1) as email,
      pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date,
      pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time,
      pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country,
      pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province,
      pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city,
      pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone,
      pgp_sym_decrypt(sex_encrypted, $1) as sex,
      pgp_sym_decrypt(familiar_name_encrypted, $1) as address_preference
    FROM user_personal_info 
    WHERE user_id = $2`,
    [process.env.ENCRYPTION_KEY, userId]
  );

  return rows.length === 0 ? {} : rows[0];
}

/**
 * Sanitize optional personal info fields
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized fields
 */
function sanitizeOptionalFields(data) {
  const { birthTime, birthCountry, birthProvince, birthCity, birthTimezone, addressPreference } = data;

  return {
    birthTime: birthTime && birthTime.trim() ? birthTime : null,
    birthCountry: birthCountry && birthCountry.trim() ? birthCountry : null,
    birthProvince: birthProvince && birthProvince.trim() ? birthProvince : null,
    birthCity: birthCity && birthCity.trim() ? birthCity : null,
    birthTimezone: birthTimezone && birthTimezone.trim() ? birthTimezone : null,
    addressPreference: addressPreference && addressPreference.trim() ? addressPreference : null
  };
}

/**
 * Validate required fields for personal information
 * @param {Object} data - Personal information
 * @returns {Object} Validation result { valid, error }
 */
function validatePersonalInfoFields(data) {
  const { email, birthDate, firstName, lastName, sex } = data;
  const isTemporary = email && email.startsWith('tempuser');

  // All users need email and birthDate
  if (!email || !birthDate) {
    return { valid: false, error: 'Missing required fields: email, birthDate' };
  }

  // Non-temporary users need complete profile
  if (!isTemporary && (!firstName || !lastName || !sex)) {
    return { valid: false, error: 'Missing required fields: firstName, lastName, email, birthDate, sex' };
  }

  return { valid: true };
}

/**
 * Validate and handle age requirements
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Validation result { valid, error }
 */
async function validateUserAge(birthDate, userId) {
  const ageValidation = validateAge(birthDate);
  
  if (!ageValidation.isValid) {
    return { 
      valid: false, 
      error: ageValidation.error + ' (This app requires users to be 18 years or older)' 
    };
  }

  // Handle age violation if user is under 18
  if (!ageValidation.isAdult) {
    const violationResult = await handleAgeViolation(userId, ageValidation.age);
    return {
      valid: false,
      error: violationResult.error || violationResult.message,
      accountDeleted: violationResult.deleted
    };
  }

  return { valid: true };
}

/**
 * Save personal information to database
 * @param {string} userId - User ID
 * @param {Object} personalInfo - Personal information
 * @returns {Promise<void>}
 */
async function savePersonalInfoToDb(userId, personalInfo) {
  const {
    firstName,
    lastName,
    email,
    birthDate,
    birthTime,
    birthCountry,
    birthProvince,
    birthCity,
    birthTimezone,
    sex,
    addressPreference
  } = personalInfo;

  await db.query(
    `INSERT INTO user_personal_info 
     (user_id, first_name_encrypted, last_name_encrypted, email_encrypted, 
      birth_date_encrypted, birth_time_encrypted, birth_country_encrypted, 
      birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted, 
      sex_encrypted, familiar_name_encrypted)
     VALUES ($2, pgp_sym_encrypt($3, $1), pgp_sym_encrypt($4, $1), 
             pgp_sym_encrypt($5, $1), pgp_sym_encrypt($6, $1), 
             pgp_sym_encrypt($7, $1), pgp_sym_encrypt($8, $1), 
             pgp_sym_encrypt($9, $1), pgp_sym_encrypt($10, $1), 
             pgp_sym_encrypt($11, $1), pgp_sym_encrypt($12, $1), 
             pgp_sym_encrypt($13, $1))
     ON CONFLICT (user_id) DO UPDATE SET
       first_name_encrypted = EXCLUDED.first_name_encrypted,
       last_name_encrypted = EXCLUDED.last_name_encrypted,
       email_encrypted = EXCLUDED.email_encrypted,
       birth_date_encrypted = EXCLUDED.birth_date_encrypted,
       birth_time_encrypted = EXCLUDED.birth_time_encrypted,
       birth_country_encrypted = EXCLUDED.birth_country_encrypted,
       birth_province_encrypted = EXCLUDED.birth_province_encrypted,
       birth_city_encrypted = EXCLUDED.birth_city_encrypted,
       birth_timezone_encrypted = EXCLUDED.birth_timezone_encrypted,
       sex_encrypted = EXCLUDED.sex_encrypted,
       familiar_name_encrypted = EXCLUDED.familiar_name_encrypted,
       updated_at = CURRENT_TIMESTAMP`,
    [
      process.env.ENCRYPTION_KEY,
      userId,
      firstName || 'Temporary',
      lastName || 'User',
      email,
      birthDate,
      birthTime,
      birthCountry,
      birthProvince,
      birthCity,
      birthTimezone,
      sex || 'Unspecified',
      addressPreference
    ]
  );
}

/**
 * Verify personal information was saved
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if saved
 */
async function verifyPersonalInfoSaved(userId) {
  const { rows } = await db.query(
    `SELECT user_id FROM user_personal_info WHERE user_id = $1`,
    [userId]
  );
  return rows.length > 0;
}

/**
 * Update free trial session with email
 * @param {string} userIdHash - Hashed user ID
 * @param {string} email - User email
 * @param {boolean} isTempUser - Whether user is temporary
 * @returns {Promise<void>}
 */
async function updateTrialSessionEmail(userIdHash, email, isTempUser) {
  if (!isTempUser || !email) return;

  try {
    await db.query(
      `UPDATE free_trial_sessions 
       SET email_encrypted = pgp_sym_encrypt($1, $2)
       WHERE user_id_hash = $3`,
      [email, process.env.ENCRYPTION_KEY, userIdHash]
    );
  } catch (err) {
    console.error('[USER-PROFILE-SERVICE] Failed to update free trial email:', err.message);
  }
}

/**
 * Save minimal astrology data (sun sign only)
 * @param {string} userIdHash - Hashed user ID
 * @param {string} birthDate - Birth date
 * @returns {Promise<void>}
 */
async function saveMinimalAstrology(userIdHash, birthDate) {
  try {
    const sunSign = calculateSunSignFromDate(birthDate);
    if (!sunSign) return;

    const minimalAstrologyData = {
      sun_sign: sunSign,
      sun_degree: 0,
      moon_sign: null,
      moon_degree: null,
      rising_sign: null,
      rising_degree: null,
      calculated_at: new Date().toISOString()
    };

    await db.query(
      `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id_hash) DO UPDATE SET
         zodiac_sign = EXCLUDED.zodiac_sign,
         astrology_data = EXCLUDED.astrology_data,
         updated_at = CURRENT_TIMESTAMP`,
      [userIdHash, sunSign, JSON.stringify(minimalAstrologyData)]
    );

    // Verify save
    const { rows } = await db.query(
      `SELECT astrology_data FROM user_astrology WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (rows.length === 0) {
      console.warn('[USER-PROFILE-SERVICE] Failed to verify minimal astrology save');
    }
  } catch (err) {
    console.error('[USER-PROFILE-SERVICE] Failed to save minimal astrology:', err.message);
  }
}

/**
 * Clear astrology-related cached messages
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<void>}
 */
async function clearAstrologyCache(userIdHash) {
  try {
    await db.query(
      `DELETE FROM messages 
       WHERE user_id_hash = $1 
       AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
      [userIdHash]
    );
  } catch (err) {
    console.error('[USER-PROFILE-SERVICE] Failed to clear astrology cache:', err.message);
  }
}

/**
 * Enqueue full birth chart calculation if complete data available
 * @param {string} userId - User ID
 * @param {Object} sanitizedFields - Sanitized optional fields
 * @param {string} birthDate - Birth date
 * @returns {Promise<void>}
 */
async function enqueueFullBirthChart(userId, sanitizedFields, birthDate) {
  const { birthTime, birthCountry, birthProvince, birthCity } = sanitizedFields;

  if (!birthTime || !birthCountry || !birthProvince || !birthCity || !birthDate) {
    return;
  }

  try {
    // Delay to ensure write propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    await enqueueMessage({
      userId,
      message: '[SYSTEM] Calculate my birth chart with rising sign and moon sign.'
    });
  } catch (err) {
    console.error('[USER-PROFILE-SERVICE] Failed to enqueue birth chart calculation:', err.message);
  }
}

/**
 * Save full astrology data if provided
 * @param {string} userIdHash - Hashed user ID
 * @param {string} zodiacSign - Zodiac sign
 * @param {Object} astrologyData - Full astrology data
 * @returns {Promise<Object>} Result { success, error }
 */
async function saveFullAstrologyData(userIdHash, zodiacSign, astrologyData) {
  if (!zodiacSign || !astrologyData) {
    return { success: true };
  }

  await db.query(
    `INSERT INTO user_astrology 
     (user_id_hash, zodiac_sign, astrology_data)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id_hash) DO UPDATE SET
       zodiac_sign = EXCLUDED.zodiac_sign,
       astrology_data = EXCLUDED.astrology_data,
       updated_at = CURRENT_TIMESTAMP`,
    [userIdHash, zodiacSign, JSON.stringify(astrologyData)]
  );

  // Verify save
  const { rows } = await db.query(
    `SELECT zodiac_sign FROM user_astrology WHERE user_id_hash = $1`,
    [userIdHash]
  );

  if (rows.length === 0) {
    return { success: false, error: 'Failed to confirm astrology data was saved' };
  }

  return { success: true };
}

/**
 * Save personal information (main entry point)
 * @param {string} userId - User ID
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} Result { success, error, accountDeleted }
 */
export async function savePersonalInfo(userId, data) {
  const { 
    firstName, lastName, email, birthDate, sex,
    zodiacSign, astrologyData 
  } = data;

  // Validate required fields
  const fieldValidation = validatePersonalInfoFields(data);
  if (!fieldValidation.valid) {
    return { success: false, error: fieldValidation.error };
  }

  // Parse and validate birth date
  const parsedBirthDate = parseDateForStorage(birthDate);
  if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
    return { success: false, error: 'Invalid birth date format' };
  }

  // Validate age
  const ageValidation = await validateUserAge(parsedBirthDate, userId);
  if (!ageValidation.valid) {
    return {
      success: false,
      error: ageValidation.error,
      accountDeleted: ageValidation.accountDeleted
    };
  }

  // Sanitize optional fields
  const sanitizedFields = sanitizeOptionalFields(data);

  // Prepare complete personal info
  const personalInfo = {
    firstName,
    lastName,
    email,
    birthDate: parsedBirthDate,
    sex,
    ...sanitizedFields
  };

  // Save to database
  await savePersonalInfoToDb(userId, personalInfo);

  // Verify save succeeded
  const verified = await verifyPersonalInfoSaved(userId);
  if (!verified) {
    return { success: false, error: 'Failed to confirm personal information was saved' };
  }

  const userIdHash = hashUserId(userId);
  const isTempUser = userId.startsWith('temp_');

  // Update trial session email for temp users
  await updateTrialSessionEmail(userIdHash, email, isTempUser);

  // Save minimal astrology (sun sign)
  await saveMinimalAstrology(userIdHash, parsedBirthDate);

  // Clear old astrology messages
  await clearAstrologyCache(userIdHash);

  // Enqueue full birth chart calculation
  await enqueueFullBirthChart(userId, sanitizedFields, parsedBirthDate);

  // Save full astrology data if provided
  const astrologyResult = await saveFullAstrologyData(userIdHash, zodiacSign, astrologyData);
  if (!astrologyResult.success) {
    return astrologyResult;
  }

  return { success: true, message: 'Personal information saved successfully' };
}

/**
 * Clear astrology cache (public method)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result with deleted count
 */
export async function clearUserAstrologyCache(userId) {
  const userIdHash = hashUserId(userId);
  const result = await db.query(
    `DELETE FROM messages 
     WHERE user_id_hash = $1 
     AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
    [userIdHash]
  );

  return {
    success: true,
    message: 'Cleared astrology cache',
    deletedRows: result.rowCount
  };
}

/**
 * Get user preferences
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User preferences with defaults
 */
export async function getUserPreferences(userId) {
  const userIdHash = hashUserId(userId);

  const { rows } = await db.query(
    `SELECT 
      language, 
      response_type, 
      voice_enabled, 
      COALESCE(voice_selected, 'sophia') as voice_selected, 
      timezone, 
      COALESCE(oracle_language, 'en-US') as oracle_language 
    FROM user_preferences 
    WHERE user_id_hash = $1`,
    [userIdHash]
  );

  return rows.length === 0 ? DEFAULT_PREFERENCES : rows[0];
}

/**
 * Update timezone only
 * @param {string} userId - User ID
 * @param {string} timezone - Timezone string
 * @returns {Promise<Object>} Result
 */
export async function updateTimezone(userId, timezone) {
  const userIdHash = hashUserId(userId);

  await db.query(
    `INSERT INTO user_preferences (user_id_hash, timezone)
     VALUES ($1, $2)
     ON CONFLICT (user_id_hash) DO UPDATE SET
       timezone = EXCLUDED.timezone,
       updated_at = CURRENT_TIMESTAMP`,
    [userIdHash, timezone]
  );

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
  const userIdHash = hashUserId(userId);

  // Validate language
  if (!VALID_LANGUAGES.includes(language)) {
    return { success: false, error: `Invalid language: ${language}` };
  }

  // Validate response type
  if (!VALID_RESPONSE_TYPES.includes(response_type)) {
    return { success: false, error: `Invalid response_type: ${response_type}` };
  }

  // Validate oracle language
  if (!VALID_ORACLE_LANGUAGES.includes(oracle_language)) {
    return { success: false, error: `Invalid oracle_language: ${oracle_language}` };
  }

  const { rows } = await db.query(
    `INSERT INTO user_preferences 
     (user_id_hash, language, response_type, voice_enabled, timezone, oracle_language)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id_hash) DO UPDATE SET
       language = EXCLUDED.language,
       response_type = EXCLUDED.response_type,
       voice_enabled = EXCLUDED.voice_enabled,
       timezone = EXCLUDED.timezone,
       oracle_language = EXCLUDED.oracle_language,
       updated_at = CURRENT_TIMESTAMP
     RETURNING language, response_type, voice_enabled, timezone, oracle_language`,
    [userIdHash, language, response_type, voice_enabled !== false, timezone, oracle_language]
  );

  return { success: true, preferences: rows[0] };
}

/**
 * Update full preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Full preferences
 * @returns {Promise<Object>} Result
 */
export async function updateFullPreferences(userId, preferences) {
  const { language, response_type, voice_enabled, voice_selected, timezone, oracle_language } = preferences;
  const userIdHash = hashUserId(userId);

  // Validate language
  if (!VALID_LANGUAGES.includes(language)) {
    return { success: false, error: 'Invalid language' };
  }

  // Validate response type
  if (!VALID_RESPONSE_TYPES.includes(response_type)) {
    return { success: false, error: 'Invalid response_type' };
  }

  // Validate and default oracle language
  const selectedOracleLanguage = (oracle_language && VALID_ORACLE_LANGUAGES.includes(oracle_language)) 
    ? oracle_language 
    : language;

  // Validate and default voice
  const selectedVoice = VALID_VOICES.includes(voice_selected) ? voice_selected : 'sophia';

  const { rows } = await db.query(
    `INSERT INTO user_preferences 
     (user_id_hash, language, response_type, voice_enabled, voice_selected, timezone, oracle_language)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id_hash) DO UPDATE SET
       language = EXCLUDED.language,
       response_type = EXCLUDED.response_type,
       voice_enabled = EXCLUDED.voice_enabled,
       voice_selected = EXCLUDED.voice_selected,
       timezone = EXCLUDED.timezone,
       oracle_language = EXCLUDED.oracle_language,
       updated_at = CURRENT_TIMESTAMP
     RETURNING language, response_type, voice_enabled, voice_selected, timezone, oracle_language`,
    [userIdHash, language, response_type, voice_enabled !== false, selectedVoice, timezone, selectedOracleLanguage]
  );

  return { success: true, preferences: rows[0] };
}

export default {
  getPersonalInfo,
  savePersonalInfo,
  clearUserAstrologyCache,
  getUserPreferences,
  updateTimezone,
  updateLanguagePreferences,
  updateFullPreferences
};
