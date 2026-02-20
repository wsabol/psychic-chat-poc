/**
 * Free Trial Service
 * Business logic for free trial personal information handling
 */

import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import { calculateSunSignFromDate } from '../shared/zodiacUtils.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * Extract client IP from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
export function extractClientIp(req) {
  const ip = req.headers['x-client-ip'] || 
             req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             req.ip ||
             '127.0.0.1'; // Fallback for local development
  
  // Clean up IPv6 localhost addresses
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  return ip;
}

/**
 * Sanitize and apply defaults to personal info fields
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized data with defaults
 */
export function sanitizePersonalInfo(data) {
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
  } = data;

  // Match original logic exactly: check if value exists and trim is truthy, return original value
  const safeTime = birthTime && birthTime.trim() ? birthTime : null;
  const safeCountry = birthCountry && birthCountry.trim() ? birthCountry : null;
  const safeProvince = birthProvince && birthProvince.trim() ? birthProvince : null;
  const safeCity = birthCity && birthCity.trim() ? birthCity : null;
  const safeTimezone = birthTimezone && birthTimezone.trim() ? birthTimezone : null;
  const safeAddressPreference = addressPreference && addressPreference.trim() ? addressPreference : null;

  return {
    firstName: firstName || 'Seeker',
    lastName: lastName || 'Soul',
    email,
    birthDate,
    birthTime: safeTime,
    birthCountry: safeCountry,
    birthProvince: safeProvince,
    birthCity: safeCity,
    birthTimezone: safeTimezone,
    sex: sex || 'Unspecified',
    addressPreference: safeAddressPreference
  };
}

/**
 * Save personal information to database
 * @param {string} tempUserId - Temporary user ID
 * @param {Object} personalInfo - Sanitized personal information
 * @returns {Promise<void>}
 * @throws {Error} If database save fails
 */
export async function savePersonalInfo(tempUserId, personalInfo) {
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

  try {
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
        tempUserId,
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
      ]
    );
  } catch (err) {
    logErrorFromCatch('[FREE-TRIAL-SERVICE] ✗ Database error saving personal info:', {
      error: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack
    });
    throw new Error(`Failed to save personal information to database: ${err.message}`);
  }
}

/**
 * Verify personal information was saved successfully
 * @param {string} tempUserId - Temporary user ID
 * @returns {Promise<boolean>} True if data exists
 */
export async function verifyPersonalInfoSaved(tempUserId) {
  const { rows } = await db.query(
    `SELECT user_id FROM user_personal_info WHERE user_id = $1`,
    [tempUserId]
  );
  return rows.length > 0;
}

/**
 * Update free trial session with email
 * @param {string} userIdHash - Hashed user ID
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export async function updateTrialSessionEmail(userIdHash, email) {
  if (!email) return;

  try {
    await db.query(
      `UPDATE free_trial_sessions 
       SET email_encrypted = pgp_sym_encrypt($1, $2)
       WHERE user_id_hash = $3`,
      [email, process.env.ENCRYPTION_KEY, userIdHash]
    );
  } catch (err) {
    // Non-fatal: Log error but continue
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to update trial session email:', err.message);
  }
}

/**
 * Calculate and save minimal astrology data (sun sign only)
 * @param {string} userIdHash - Hashed user ID
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @returns {Promise<void>}
 */
export async function saveMinimalAstrology(userIdHash, birthDate) {
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
  } catch (err) {
    // Non-fatal: continue anyway
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to save minimal astrology:', err.message);
  }
}

/**
 * Clear old astrology-related messages
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<void>}
 */
export async function clearAstrologyMessages(userIdHash) {
  try {
    await db.query(
      `DELETE FROM messages 
       WHERE user_id_hash = $1 
       AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
      [userIdHash]
    );
  } catch (err) {
    // Non-fatal
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to clear astrology messages:', err.message);
  }
}

/**
 * Calculate full birth chart directly using Lambda.
 * Birth time is optional – defaults to noon (12:00:00) when not supplied.
 * NOTE: Moon sign estimation is reasonably reliable at noon (the moon moves
 * ~1 sign every 2–3 days). Rising sign WITHOUT birth time is NOT reliable —
 * it changes every ~2 hours (one sign per 2 hours across 12 signs in 24 hours).
 * When birth time is absent, treat any returned rising sign as approximate only.
 * @param {string} tempUserId - Temporary user ID
 * @param {Object} personalInfo - Personal information
 * @returns {Promise<void>}
 */
export async function enqueueFullBirthChartCalculation(tempUserId, personalInfo) {
  const { birthTime, birthCountry, birthProvince, birthCity, birthDate, birthTimezone } = personalInfo;

  // Require at least city + province + country + date for a meaningful calculation.
  // Birth time is optional; we default to noon. Moon sign will be reasonable but
  // rising sign will be unreliable without an accurate birth time.
  if (!birthCountry || !birthProvince || !birthCity || !birthDate) {
    return;
  }

  try {
    // Delay to ensure write is fully propagated
    const delayMs = 1000;
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Import Lambda calculation function
    const { calculateBirthChart } = await import('./lambda-astrology.js');
    
    // Call Lambda to calculate birth chart.
    // Default birth_time to noon when not provided – still yields useful moon/rising signs.
    const result = await calculateBirthChart({
      birth_date: birthDate,
      birth_time: birthTime || '12:00:00',
      birth_country: birthCountry,
      birth_province: birthProvince,
      birth_city: birthCity,
      birth_timezone: birthTimezone
    });
    
    if (result.success) {
      // Save full astrology data
      const userIdHash = hashUserId(tempUserId);
      const zodiacSign = result.sun_sign || calculateSunSignFromDate(birthDate);
      
      await db.query(
        `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id_hash) DO UPDATE SET
           zodiac_sign = EXCLUDED.zodiac_sign,
           astrology_data = EXCLUDED.astrology_data,
           updated_at = CURRENT_TIMESTAMP`,
        [userIdHash, zodiacSign, JSON.stringify(result)]
      );
      
      // NOTE: Free trial users get insights on-demand only (generated once when requested)
      // They do NOT get daily regeneration - the same insights persist for their entire trial
      
    } else {
      console.error(`[FREE-TRIAL-SERVICE] Birth chart calculation failed:`, result.error);
    }
  } catch (err) {
    // Non-fatal
    logErrorFromCatch('[FREE-TRIAL-SERVICE] Failed to calculate birth chart:', err.message);
  }
}

/**
 * Save full astrology data if provided
 * @param {string} userIdHash - Hashed user ID
 * @param {string} zodiacSign - Zodiac sign
 * @param {Object} astrologyData - Full astrology data
 * @returns {Promise<void>}
 */
export async function saveFullAstrologyData(userIdHash, zodiacSign, astrologyData) {
  if (!zodiacSign || !astrologyData) return;

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
}

/**
 * Orchestrate the complete personal info save process
 * @param {string} tempUserId - Temporary user ID
 * @param {Object} personalInfo - Personal information
 * @param {string} zodiacSign - Optional zodiac sign
 * @param {Object} astrologyData - Optional full astrology data
 * @returns {Promise<Object>} Result object
 */
export async function processPersonalInfoSave(tempUserId, personalInfo, zodiacSign, astrologyData) {
  const userIdHash = hashUserId(tempUserId);

  // Save personal information
  await savePersonalInfo(tempUserId, personalInfo);

  // Verify save succeeded
  const verified = await verifyPersonalInfoSaved(tempUserId);
  if (!verified) {
    return {
      success: false,
      error: 'Failed to confirm personal information was saved'
    };
  }

  // Update trial session with email
  await updateTrialSessionEmail(userIdHash, personalInfo.email);

  // Determine if we have enough birth location data for a full chart calculation.
  // Birth time is no longer required – the lambda defaults to noon when absent.
  const { birthCountry, birthProvince, birthCity, birthDate } = personalInfo;
  const hasLocationData = !!(birthCountry && birthProvince && birthCity && birthDate);

  // Only save minimal astrology (sun sign) when we lack location data.
  // If location data IS present we skip this so the upcoming full calculation
  // doesn't race with a partial write.
  if (!hasLocationData) {
    await saveMinimalAstrology(userIdHash, personalInfo.birthDate);
  }

  // Clear old astrology messages
  await clearAstrologyMessages(userIdHash);

  // Trigger full birth chart calculation (awaited synchronously to guarantee
  // data is written before the API response returns).
  if (hasLocationData) {
    await enqueueFullBirthChartCalculation(tempUserId, personalInfo);
  }

  // Save full astrology data if provided
  await saveFullAstrologyData(userIdHash, zodiacSign, astrologyData);

  return {
    success: true,
    message: 'Personal information saved successfully'
  };
}

export default {
  extractClientIp,
  sanitizePersonalInfo,
  savePersonalInfo,
  verifyPersonalInfoSaved,
  updateTrialSessionEmail,
  saveMinimalAstrology,
  clearAstrologyMessages,
  enqueueFullBirthChartCalculation,
  saveFullAstrologyData,
  processPersonalInfoSave
};
