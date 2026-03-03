/**
 * Personal Information Repository
 * Database operations for user personal information.
 *
 * Data minimisation notes (2026-03-03):
 *   - first_name_encrypted and last_name_encrypted have been dropped from the table.
 *   - Email is no longer returned to the client; it is saved from the verified
 *     Firebase auth token and kept server-side only.
 */

import { db } from '../../../shared/db.js';

/**
 * Get user personal information by user ID.
 * Returns birth details, location, sex, and familiar name only.
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Decrypted personal information
 */
export async function findPersonalInfoByUserId(userId) {
  const { rows } = await db.query(
    `SELECT 
      pgp_sym_decrypt(birth_date_encrypted,      $1) as birth_date,
      pgp_sym_decrypt(birth_time_encrypted,      $1) as birth_time,
      pgp_sym_decrypt(birth_country_encrypted,   $1) as birth_country,
      pgp_sym_decrypt(birth_province_encrypted,  $1) as birth_province,
      pgp_sym_decrypt(birth_city_encrypted,      $1) as birth_city,
      pgp_sym_decrypt(birth_timezone_encrypted,  $1) as birth_timezone,
      pgp_sym_decrypt(sex_encrypted,             $1) as sex,
      pgp_sym_decrypt(familiar_name_encrypted,   $1) as address_preference
    FROM user_personal_info 
    WHERE user_id = $2`,
    [process.env.ENCRYPTION_KEY, userId]
  );

  return rows.length === 0 ? {} : rows[0];
}

/**
 * Save or update personal information.
 * Email is passed in from the verified Firebase token (emailFromToken) — it is
 * never taken from the client form body for registered users.
 *
 * @param {string} userId       - User ID
 * @param {Object} personalInfo - Personal information to save
 * @returns {Promise<void>}
 */
export async function upsertPersonalInfo(userId, personalInfo) {
  const {
    email,
    birthDate,
    birthTime,
    birthCountry,
    birthProvince,
    birthCity,
    birthTimezone,
    sex,
    addressPreference,
  } = personalInfo;

  await db.query(
    `INSERT INTO user_personal_info 
     (user_id, email_encrypted, email_hash,
      birth_date_encrypted, birth_time_encrypted, birth_country_encrypted, 
      birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted, 
      sex_encrypted, familiar_name_encrypted)
     VALUES ($2,
             pgp_sym_encrypt($3, $1), encode(digest(lower(trim($3)), 'sha256'), 'hex'),
             pgp_sym_encrypt($4, $1), 
             pgp_sym_encrypt($5, $1), pgp_sym_encrypt($6, $1), 
             pgp_sym_encrypt($7, $1), pgp_sym_encrypt($8, $1), 
             pgp_sym_encrypt($9, $1), pgp_sym_encrypt($10, $1), 
             pgp_sym_encrypt($11, $1))
     ON CONFLICT (user_id) DO UPDATE SET
       email_encrypted          = EXCLUDED.email_encrypted,
       email_hash               = EXCLUDED.email_hash,
       birth_date_encrypted     = EXCLUDED.birth_date_encrypted,
       birth_time_encrypted     = EXCLUDED.birth_time_encrypted,
       birth_country_encrypted  = EXCLUDED.birth_country_encrypted,
       birth_province_encrypted = EXCLUDED.birth_province_encrypted,
       birth_city_encrypted     = EXCLUDED.birth_city_encrypted,
       birth_timezone_encrypted = EXCLUDED.birth_timezone_encrypted,
       sex_encrypted            = EXCLUDED.sex_encrypted,
       familiar_name_encrypted  = EXCLUDED.familiar_name_encrypted,
       updated_at               = CURRENT_TIMESTAMP`,
    [
      process.env.ENCRYPTION_KEY,
      userId,
      email,
      birthDate,
      birthTime,
      birthCountry,
      birthProvince,
      birthCity,
      birthTimezone,
      sex || 'Unspecified',
      addressPreference,
    ]
  );
}

/**
 * Check if personal info exists for user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if exists
 */
export async function personalInfoExists(userId) {
  const { rows } = await db.query(
    `SELECT user_id FROM user_personal_info WHERE user_id = $1`,
    [userId]
  );
  return rows.length > 0;
}

/**
 * Update free trial session email
 * @param {string} userIdHash - Hashed user ID
 * @param {string} email      - User email
 * @returns {Promise<void>}
 */
export async function updateTrialSessionEmail(userIdHash, email) {
  await db.query(
    `UPDATE free_trial_sessions 
     SET email_encrypted = pgp_sym_encrypt($1, $2)
     WHERE user_id_hash = $3`,
    [email, process.env.ENCRYPTION_KEY, userIdHash]
  );
}
