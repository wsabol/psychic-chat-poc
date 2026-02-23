
/**
 * OPTIMIZED User Data Database Queries
 * Combines multiple queries into single JOIN for performance
 */

import { db } from '../../../../shared/db.js';
import { hashUserId } from '../../../../shared/hashUtils.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

// DEBUG: Log the encryption key being used (first/last 4 chars only for security)
if (ENCRYPTION_KEY === 'default_key') {
  console.error('[CRITICAL] Worker is using DEFAULT_KEY! ENCRYPTION_KEY environment variable is not set!');
} else {
  const keyPreview = `${ENCRYPTION_KEY.substring(0, 4)}...${ENCRYPTION_KEY.substring(ENCRYPTION_KEY.length - 4)}`;
}

/**
 * Fetch ALL user data in a single optimized query with JOINs
 * Returns: { personalInfo, astrologyInfo, language, oracleLanguage, isTemp }
 * 
 * PERFORMANCE: Single round-trip to database instead of 4-5 separate queries
 */
export async function fetchAllUserData(userId) {
  try {
    const userIdHash = hashUserId(userId);
    
    // DEBUG: Log the query parameters
    
    const { rows } = await db.query(`
      SELECT 
        -- Personal Info — use CASE WHEN to avoid pgp_sym_decrypt(NULL, key) which can
        -- throw "Wrong key or corrupt data" on some pgcrypto builds when the column
        -- is NULL (scaffold rows leave birth_date, birth_time, etc. as NULL).
        CASE WHEN upi.first_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.first_name_encrypted, $1) ELSE NULL END as first_name,
        CASE WHEN upi.last_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.last_name_encrypted, $1) ELSE NULL END as last_name,
        CASE WHEN upi.birth_date_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.birth_date_encrypted, $1) ELSE NULL END as birth_date,
        CASE WHEN upi.birth_time_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.birth_time_encrypted, $1) ELSE NULL END as birth_time,
        CASE WHEN upi.birth_country_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.birth_country_encrypted, $1) ELSE NULL END as birth_country,
        CASE WHEN upi.birth_province_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.birth_province_encrypted, $1) ELSE NULL END as birth_province,
        CASE WHEN upi.birth_city_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.birth_city_encrypted, $1) ELSE NULL END as birth_city,
        CASE WHEN upi.birth_timezone_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.birth_timezone_encrypted, $1) ELSE NULL END as birth_timezone,
        CASE WHEN upi.sex_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.sex_encrypted, $1) ELSE NULL END as sex,
        CASE WHEN upi.familiar_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.familiar_name_encrypted, $1) ELSE NULL END as address_preference,
        CASE WHEN upi.email_encrypted IS NOT NULL THEN pgp_sym_decrypt(upi.email_encrypted, $1) ELSE NULL END as email,
        
        -- Astrology Data
        ua.zodiac_sign,
        ua.astrology_data,
        
        -- Preferences
        COALESCE(up.language, 'en-US') as language,
        COALESCE(up.oracle_language, 'en-US') as oracle_language,
        
        -- Free Trial Session Check
        fts.id as free_trial_session_id
        
      FROM user_personal_info upi
      LEFT JOIN user_astrology ua ON ENCODE(DIGEST(upi.user_id, 'sha256'), 'hex') = ua.user_id_hash
      LEFT JOIN user_preferences up ON ENCODE(DIGEST(upi.user_id, 'sha256'), 'hex') = up.user_id_hash
      LEFT JOIN free_trial_sessions fts ON ENCODE(DIGEST(upi.user_id, 'sha256'), 'hex') = fts.user_id_hash
      WHERE upi.user_id = $2
    `, [ENCRYPTION_KEY, userId]);
    
    if (rows.length === 0) {
      console.error(`[FETCH-USER-DATA] No user_personal_info found for userId: ${userId}`);
      
      // FALLBACK: Check if this is a free trial user without user_personal_info yet
      const { rows: ftsRows } = await db.query(`
        SELECT id, user_id_hash 
        FROM free_trial_sessions 
        WHERE user_id_hash = $1
      `, [userIdHash]);
      
      if (ftsRows.length > 0) {
        // user_personal_info scaffold hasn't been written yet (race condition on
        // first request) — look up language from user_preferences directly so the
        // oracle always responds in the user's selected language rather than always
        // defaulting to 'en-US'.
        let fallbackLanguage    = 'en-US';
        let fallbackOracleLang  = 'en-US';
        try {
          const { rows: prefRows } = await db.query(
            `SELECT COALESCE(language, 'en-US') as language,
                    COALESCE(oracle_language, 'en-US') as oracle_language
             FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
          );
          if (prefRows.length > 0) {
            fallbackLanguage   = prefRows[0].language;
            fallbackOracleLang = prefRows[0].oracle_language;
          }
        } catch (_) { /* non-fatal — stick with defaults */ }

        // Also look up any astrology data that was persisted (e.g. via the sign-picker
        // flow) even though the user_personal_info scaffold is missing.  Without this,
        // the horoscope generator throws "birth chart required" and returns 500.
        let fallbackAstrologyInfo = null;
        try {
          const { rows: astroRows } = await db.query(
            `SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id_hash = $1`,
            [userIdHash]
          );
          if (astroRows.length > 0 && astroRows[0].zodiac_sign) {
            let astroData = astroRows[0].astrology_data;
            if (astroData && typeof astroData === 'string') {
              try { astroData = JSON.parse(astroData); } catch (_) { astroData = null; }
            }
            fallbackAstrologyInfo = {
              zodiac_sign:    astroRows[0].zodiac_sign,
              astrology_data: astroData,
            };
          }
        } catch (_) { /* non-fatal — astrologyInfo stays null */ }

        // Return minimal temp user data structure so oracle can respond
        return {
          personalInfo: {
            first_name: 'Seeker',
            last_name: null,
            birth_date: null,
            birth_time: null,
            birth_country: null,
            birth_province: null,
            birth_city: null,
            birth_timezone: null,
            sex: null,
            address_preference: 'Seeker'
          },
          astrologyInfo: fallbackAstrologyInfo,
          language: fallbackLanguage,
          oracleLanguage: fallbackOracleLang,
          isTemp: true
        };
      }
      
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
    
    // Check if temporary user using MULTIPLE indicators for reliability:
    // 1. Has a free_trial_sessions record (most reliable)
    // 2. Email ends with @psychic.local (if decryption worked)
    // 3. Firebase anonymous UID pattern (alphanumeric 20+ chars, no special chars except user_id itself)
    
    const hasFreeTrialSession = !!row.free_trial_session_id;
    const emailIndicator = row.email ? row.email.endsWith('@psychic.local') : false;
    const firebaseAnonPattern = /^[a-zA-Z0-9]{20,}$/.test(userId);
    
    // User is temp if ANY indicator is true
    const isTemp = hasFreeTrialSession || emailIndicator || firebaseAnonPattern;
    
    return {
      personalInfo: {
        first_name: row.first_name || 'Seeker',  // Fallback for NULL
        last_name: row.last_name,
        birth_date: row.birth_date,
        birth_time: row.birth_time,
        birth_country: row.birth_country,
        birth_province: row.birth_province,
        birth_city: row.birth_city,
        birth_timezone: row.birth_timezone,
        sex: row.sex,
        address_preference: row.address_preference || row.first_name || 'Seeker'
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
    console.error(`[ERROR] fetchAllUserData failed for userId: ${userId}`, err);
    console.error(`[ERROR] Error message: ${err.message}`);
    console.error(`[ERROR] Error stack: ${err.stack}`);
    
    // CRITICAL: If decryption fails, check if ENCRYPTION_KEY mismatch
    if (err.message && err.message.includes('decrypt')) {
      console.error(`[CRITICAL] Decryption error - possible ENCRYPTION_KEY mismatch between API and Worker!`);
    }
    
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
