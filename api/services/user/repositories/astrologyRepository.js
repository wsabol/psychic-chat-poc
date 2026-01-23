/**
 * Astrology Repository
 * Database operations for astrology data and messages
 */

import { db } from '../../../shared/db.js';

/**
 * Save or update astrology data
 * @param {string} userIdHash - Hashed user ID
 * @param {string} zodiacSign - Zodiac sign
 * @param {Object} astrologyData - Astrology data object
 * @returns {Promise<void>}
 */
export async function upsertAstrologyData(userIdHash, zodiacSign, astrologyData) {
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
 * Check if astrology data exists for user
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<boolean>} True if exists
 */
export async function astrologyDataExists(userIdHash) {
  const { rows } = await db.query(
    `SELECT user_id_hash FROM user_astrology WHERE user_id_hash = $1`,
    [userIdHash]
  );
  return rows.length > 0;
}

/**
 * Get astrology data for user
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<Object|null>} Astrology data or null if not found
 */
export async function findAstrologyDataByUserIdHash(userIdHash) {
  const { rows } = await db.query(
    `SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id_hash = $1`,
    [userIdHash]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Delete astrology-related cached messages
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<number>} Number of deleted rows
 */
export async function deleteAstrologyCachedMessages(userIdHash) {
  const result = await db.query(
    `DELETE FROM messages 
     WHERE user_id_hash = $1 
     AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
    [userIdHash]
  );
  return result.rowCount;
}
