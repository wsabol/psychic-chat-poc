/**
 * User Data Database Queries
 * All database queries for fetching user info, astrology, preferences
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * Fetch user's personal information (name, birth details, location)
 */
export async function fetchUserPersonalInfo(userId) {
  try {
    const { rows } = await db.query(`
      SELECT 
        pgp_sym_decrypt(first_name_encrypted, $1) as first_name,
        pgp_sym_decrypt(last_name_encrypted, $1) as last_name,
        pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date,
        pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time,
        pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country,
        pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province,
        pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city,
        pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone,
        pgp_sym_decrypt(sex_encrypted, $1) as sex,
        pgp_sym_decrypt(familiar_name_encrypted, $1) as address_preference 
      FROM user_personal_info WHERE user_id = $2
    `, [ENCRYPTION_KEY, userId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch user's astrology profile (sun, moon, rising signs + birth chart data)
 */
export async function fetchUserAstrology(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const { rows } = await db.query(
      "SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id_hash = $1",
      [userIdHash]
    );
    if (rows.length > 0) {
      const astrologyInfo = rows[0];
      if (typeof astrologyInfo.astrology_data === 'string') {
        astrologyInfo.astrology_data = JSON.parse(astrologyInfo.astrology_data);
      }
      return astrologyInfo;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Check if user is on a trial/temporary account
 * Temporary accounts have emails matching: temp_*@psychic.local
 * 
 * Defense-in-depth check requires BOTH:
 * 1. Starts with 'temp_' prefix
 * 2. Ends with '@psychic.local' domain (only temp accounts use this)
 */
export async function isTemporaryUser(userId) {
  try {
    const { rows } = await db.query(
      `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
      [ENCRYPTION_KEY, userId]
    );
    if (rows.length > 0 && rows[0].email) {
      const email = rows[0].email;
      // Defense-in-depth: Check both prefix AND domain
      return email.startsWith('temp_') && email.endsWith('@psychic.local');
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Fetch user's language preference (for UI/display)
 */
export async function fetchUserLanguagePreference(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const { rows } = await db.query(
      `SELECT language FROM user_preferences WHERE user_id_hash = $1`,
      [userIdHash]
    );
    if (rows.length > 0 && rows[0].language) {
      return rows[0].language;
    }
    return 'en-US';
  } catch (err) {
    return 'en-US';
  }
}

/**
 * Fetch user's oracle language preference
 * Separate from UI language - oracle can respond in different language
 */
export async function fetchUserOracleLanguagePreference(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const { rows } = await db.query(
      `SELECT COALESCE(oracle_language, 'en-US') as oracle_language FROM user_preferences WHERE user_id_hash = $1`,
      [userIdHash]
    );
    if (rows.length > 0 && rows[0].oracle_language) {
      return rows[0].oracle_language;
    }
    return 'en-US';
  } catch (err) {
    return 'en-US';
  }
}
