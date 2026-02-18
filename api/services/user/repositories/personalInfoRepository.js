/**
 * Personal Information Repository
 * Database operations for user personal information
 */

import { db } from '../../../shared/db.js';

/**
 * Get user personal information by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Decrypted personal information
 */
export async function findPersonalInfoByUserId(userId) {
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
 * Save or update personal information
 * @param {string} userId - User ID
 * @param {Object} personalInfo - Personal information to save
 * @returns {Promise<void>}
 */
export async function upsertPersonalInfo(userId, personalInfo) {
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
 * @param {string} email - User email
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
