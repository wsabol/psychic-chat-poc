/**
 * OPTIMIZED User Data Database Queries
 * Combines multiple queries into single JOIN for performance
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * Fetch ALL user data in a single optimized query with JOINs
 * Returns: { personalInfo, astrologyInfo, language, oracleLanguage, isTemp }
 * 
 * PERFORMANCE: Single round-trip to database instead of 4-5 separate queries
 */
export async function fetchAllUserData(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    const { rows } = await db.query(`
      SELECT 
        -- Personal Info
        pgp_sym_decrypt(upi.first_name_encrypted, $1) as first_name,
        pgp_sym_decrypt(upi.last_name_encrypted, $1) as last_name,
        pgp_sym_decrypt(upi.birth_date_encrypted, $1) as birth_date,
        pgp_sym_decrypt(upi.birth_time_encrypted, $1) as birth_time,
        pgp_sym_decrypt(upi.birth_country_encrypted, $1) as birth_country,
        pgp_sym_decrypt(upi.birth_province_encrypted, $1) as birth_province,
        pgp_sym_decrypt(upi.birth_city_encrypted, $1) as birth_city,
        pgp_sym_decrypt(upi.birth_timezone_encrypted, $1) as birth_timezone,
        pgp_sym_decrypt(upi.sex_encrypted, $1) as sex,
        pgp_sym_decrypt(upi.familiar_name_encrypted, $1) as address_preference,
        pgp_sym_decrypt(upi.email_encrypted, $1) as email,
        
        -- Astrology Data
        ua.zodiac_sign,
        ua.astrology_data,
        
        -- Preferences
        COALESCE(up.language, 'en-US') as language,
        COALESCE(up.oracle_language, 'en-US') as oracle_language
        
      FROM user_personal_info upi
      LEFT JOIN user_astrology ua ON ENCODE(DIGEST(upi.user_id, 'sha256'), 'hex') = ua.user_id_hash
      LEFT JOIN user_preferences up ON ENCODE(DIGEST(upi.user_id, 'sha256'), 'hex') = up.user_id_hash
      WHERE upi.user_id = $2
    `, [ENCRYPTION_KEY, userId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    // Parse astrology_data if it's a string
    let astrologyData = row.astrology_data;
    if (astrologyData && typeof astrologyData === 'string') {
      try {
        astrologyData = JSON.parse(astrologyData);
      } catch (e) {
        astrologyData = null;
      }
    }
    
    // Check if temporary user (defense-in-depth: both prefix AND domain)
    const isTemp = row.email ? 
      (row.email.startsWith('temp_') && row.email.endsWith('@psychic.local')) : 
      false;
    
    return {
      personalInfo: {
        first_name: row.first_name,
        last_name: row.last_name,
        birth_date: row.birth_date,
        birth_time: row.birth_time,
        birth_country: row.birth_country,
        birth_province: row.birth_province,
        birth_city: row.birth_city,
        birth_timezone: row.birth_timezone,
        sex: row.sex,
        address_preference: row.address_preference
      },
      astrologyInfo: row.zodiac_sign ? {
        zodiac_sign: row.zodiac_sign,
        astrology_data: astrologyData
      } : null,
      language: row.language,
      oracleLanguage: row.oracle_language,
      isTemp: isTemp
    };
    
  } catch (err) {
    return null;
  }
}

// Legacy compatibility exports - these now use the optimized query internally
export async function fetchUserPersonalInfo(userId) {
  const data = await fetchAllUserData(userId);
  return data ? data.personalInfo : null;
}

export async function fetchUserAstrology(userId) {
  const data = await fetchAllUserData(userId);
  return data ? data.astrologyInfo : null;
}

export async function isTemporaryUser(userId) {
  const data = await fetchAllUserData(userId);
  return data ? data.isTemp : false;
}

export async function fetchUserLanguagePreference(userId) {
  const data = await fetchAllUserData(userId);
  return data ? data.language : 'en-US';
}

export async function fetchUserOracleLanguagePreference(userId) {
  const data = await fetchAllUserData(userId);
  return data ? data.oracleLanguage : 'en-US';
}
