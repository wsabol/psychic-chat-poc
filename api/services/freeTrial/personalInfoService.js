/**
 * Free Trial — Personal Info Service
 * Handles personal information sanitization, DB persistence, session email
 * updates, and the full save orchestration.
 *
 * Sections:
 *   1. Input Sanitization — sanitizePersonalInfo
 *   2. Personal Info DB   — savePersonalInfo, verifyPersonalInfoSaved
 *   3. Session Email DB   — updateTrialSessionEmail
 *   4. Orchestration      — processPersonalInfoSave
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import {
  saveMinimalAstrology,
  clearAstrologyMessages,
  calculateAndSaveFullBirthChart,
  saveFullAstrologyData,
} from './astrologyService.js';

// ─── 1. INPUT SANITIZATION ───────────────────────────────────────────────────

/**
 * Sanitize and apply defaults to personal info fields.
 * Returns the original value only when it exists and is non-empty after trimming.
 *
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized data with defaults applied
 */
export function sanitizePersonalInfo(data) {
  const {
    firstName, lastName, email, birthDate, birthTime,
    birthCountry, birthProvince, birthCity, birthTimezone,
    sex, addressPreference,
  } = data;

  const safeStr = (val) => (val && val.trim() ? val : null);

  return {
    firstName:         firstName || 'Seeker',
    lastName:          lastName  || 'Soul',
    email,
    birthDate,
    birthTime:         safeStr(birthTime),
    birthCountry:      safeStr(birthCountry),
    birthProvince:     safeStr(birthProvince),
    birthCity:         safeStr(birthCity),
    birthTimezone:     safeStr(birthTimezone),
    sex:               sex || 'Unspecified',
    addressPreference: safeStr(addressPreference),
  };
}

// ─── 2. PERSONAL INFO — DATABASE OPERATIONS ──────────────────────────────────

/**
 * Save personal information to the database (encrypted).
 *
 * @param {string} tempUserId   - Temporary user ID
 * @param {Object} personalInfo - Sanitized personal information
 * @throws {Error} If the database write fails
 */
export async function savePersonalInfo(tempUserId, personalInfo) {
  const {
    firstName, lastName, email, birthDate, birthTime,
    birthCountry, birthProvince, birthCity, birthTimezone,
    sex, addressPreference,
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
         first_name_encrypted      = EXCLUDED.first_name_encrypted,
         last_name_encrypted       = EXCLUDED.last_name_encrypted,
         email_encrypted           = EXCLUDED.email_encrypted,
         birth_date_encrypted      = EXCLUDED.birth_date_encrypted,
         birth_time_encrypted      = EXCLUDED.birth_time_encrypted,
         birth_country_encrypted   = EXCLUDED.birth_country_encrypted,
         birth_province_encrypted  = EXCLUDED.birth_province_encrypted,
         birth_city_encrypted      = EXCLUDED.birth_city_encrypted,
         birth_timezone_encrypted  = EXCLUDED.birth_timezone_encrypted,
         sex_encrypted             = EXCLUDED.sex_encrypted,
         familiar_name_encrypted   = EXCLUDED.familiar_name_encrypted,
         updated_at                = CURRENT_TIMESTAMP`,
      [
        process.env.ENCRYPTION_KEY,
        tempUserId, firstName, lastName, email, birthDate,
        birthTime, birthCountry, birthProvince, birthCity,
        birthTimezone, sex, addressPreference,
      ]
    );
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[PERSONAL-INFO-SERVICE] Database error saving personal info');
    throw new Error(`Failed to save personal information to database: ${err.message}`);
  }
}

/**
 * Verify personal information was saved successfully.
 *
 * @param {string} tempUserId - Temporary user ID
 * @returns {Promise<boolean>} True if a record exists
 */
export async function verifyPersonalInfoSaved(tempUserId) {
  const { rows } = await db.query(
    `SELECT user_id FROM user_personal_info WHERE user_id = $1`,
    [tempUserId]
  );
  return rows.length > 0;
}

// ─── 3. SESSION EMAIL — DATABASE OPERATIONS ──────────────────────────────────

/**
 * Update the free trial session row with the user's encrypted email.
 * Non-fatal: errors are logged but do not interrupt the caller.
 *
 * @param {string} userIdHash - Hashed user ID
 * @param {string} email      - User email
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
    logErrorFromCatch(err, 'free-trial', '[PERSONAL-INFO-SERVICE] Failed to update trial session email');
  }
}

// ─── 4. ORCHESTRATION ────────────────────────────────────────────────────────

/**
 * Orchestrate the complete personal info save process.
 *
 * Steps (in order):
 *   1. Save personal information to the database
 *   2. Verify the save succeeded
 *   3. Update trial session with email
 *   4. Save minimal astrology (sun sign only) when location data is absent
 *   5. Clear stale astrology messages
 *   6. Calculate and save a full birth chart when location data is present
 *   7. Persist any astrology data provided directly by the caller
 *
 * @param {string}  tempUserId     - Temporary user ID
 * @param {Object}  personalInfo   - Sanitized personal information
 * @param {string}  [zodiacSign]   - Optional zodiac sign (caller-supplied)
 * @param {Object}  [astrologyData] - Optional full astrology data (caller-supplied)
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export async function processPersonalInfoSave(tempUserId, personalInfo, zodiacSign, astrologyData) {
  const userIdHash = hashUserId(tempUserId);

  // 1. Save personal information
  await savePersonalInfo(tempUserId, personalInfo);

  // 2. Verify save succeeded
  const verified = await verifyPersonalInfoSaved(tempUserId);
  if (!verified) {
    return { success: false, error: 'Failed to confirm personal information was saved' };
  }

  // 3. Update trial session with email
  await updateTrialSessionEmail(userIdHash, personalInfo.email);

  // 4. Decide astrology write strategy based on available location data.
  //    Birth time is no longer required — the Lambda defaults to noon when absent.
  const { birthCountry, birthProvince, birthCity, birthDate } = personalInfo;
  const hasLocationData = !!(birthCountry && birthProvince && birthCity && birthDate);

  // Save sun-sign-only astrology when we lack location data.
  // Skip when location data IS present so the upcoming full calculation
  // doesn't race with a partial write.
  if (!hasLocationData) {
    await saveMinimalAstrology(userIdHash, personalInfo.birthDate);
  }

  // 5. Clear stale astrology messages
  await clearAstrologyMessages(userIdHash);

  // 6. Trigger full birth chart calculation (awaited synchronously to guarantee
  //    data is written before the API response returns).
  if (hasLocationData) {
    await calculateAndSaveFullBirthChart(tempUserId, personalInfo);
  }

  // 7. Persist any astrology data provided directly by the caller
  await saveFullAstrologyData(userIdHash, zodiacSign, astrologyData);

  return { success: true, message: 'Personal information saved successfully' };
}
