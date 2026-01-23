/**
 * Preferences Repository
 * Database operations for user preferences
 */

import { db } from '../../../shared/db.js';

/**
 * Find user preferences by user ID hash
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<Object|null>} User preferences or null if not found
 */
export async function findPreferencesByUserIdHash(userIdHash) {
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

  return rows.length === 0 ? null : rows[0];
}

/**
 * Update timezone only
 * @param {string} userIdHash - Hashed user ID
 * @param {string} timezone - Timezone string
 * @returns {Promise<void>}
 */
export async function upsertTimezone(userIdHash, timezone) {
  await db.query(
    `INSERT INTO user_preferences (user_id_hash, timezone)
     VALUES ($1, $2)
     ON CONFLICT (user_id_hash) DO UPDATE SET
       timezone = EXCLUDED.timezone,
       updated_at = CURRENT_TIMESTAMP`,
    [userIdHash, timezone]
  );
}

/**
 * Update language preferences (temp user flow)
 * @param {string} userIdHash - Hashed user ID
 * @param {Object} preferences - Language preferences
 * @returns {Promise<Object>} Saved preferences
 */
export async function upsertLanguagePreferences(userIdHash, preferences) {
  const { language, response_type, voice_enabled, timezone, oracle_language } = preferences;

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
    [userIdHash, language, response_type, voice_enabled, timezone, oracle_language]
  );

  return rows[0];
}

/**
 * Update full preferences
 * @param {string} userIdHash - Hashed user ID
 * @param {Object} preferences - Full preferences
 * @returns {Promise<Object>} Saved preferences
 */
export async function upsertFullPreferences(userIdHash, preferences) {
  const { language, response_type, voice_enabled, voice_selected, timezone, oracle_language } = preferences;

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
    [userIdHash, language, response_type, voice_enabled, voice_selected, timezone, oracle_language]
  );

  return rows[0];
}
