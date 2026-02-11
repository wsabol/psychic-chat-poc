/**
 * Astrology Service
 * Business logic for astrology data and calculations
 */

import { hashUserId } from '../../shared/hashUtils.js';
import { calculateSunSignFromDate } from '../../shared/zodiacUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import {
  upsertAstrologyData,
  astrologyDataExists,
  deleteAstrologyCachedMessages
} from './repositories/astrologyRepository.js';

/**
 * Save minimal astrology data (sun sign only)
 * @param {string} userIdHash - Hashed user ID
 * @param {string} birthDate - Birth date
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

    await upsertAstrologyData(userIdHash, sunSign, minimalAstrologyData);

    // Verify save
    const exists = await astrologyDataExists(userIdHash);
    if (!exists) {
    }

    // Clear old astrology messages
    await clearAstrologyCache(userIdHash);
  } catch (err) {
    logErrorFromCatch('[ASTROLOGY-SERVICE] Failed to save minimal astrology:', err.message);
  }
}

/**
 * Save full astrology data if provided
 * @param {string} userIdHash - Hashed user ID
 * @param {string} zodiacSign - Zodiac sign
 * @param {Object} astrologyData - Full astrology data
 * @returns {Promise<Object>} Result { success, error }
 */
export async function saveFullAstrology(userIdHash, zodiacSign, astrologyData) {
  try {
    await upsertAstrologyData(userIdHash, zodiacSign, astrologyData);

    // Verify save
    const exists = await astrologyDataExists(userIdHash);
    if (!exists) {
      return { success: false, error: 'Failed to confirm astrology data was saved' };
    }

    return { success: true };
  } catch (err) {
    logErrorFromCatch('[ASTROLOGY-SERVICE] Failed to save full astrology:', err.message);
    return { success: false, error: 'Failed to save astrology data' };
  }
}

/**
 * Clear astrology-related cached messages
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<void>}
 */
async function clearAstrologyCache(userIdHash) {
  try {
    await deleteAstrologyCachedMessages(userIdHash);
  } catch (err) {
    logErrorFromCatch('[ASTROLOGY-SERVICE] Failed to clear astrology cache:', err.message);
  }
}

/**
 * Clear astrology cache (public method)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result with deleted count
 */
export async function clearUserAstrologyCache(userId) {
  const userIdHash = hashUserId(userId);
  const deletedCount = await deleteAstrologyCachedMessages(userIdHash);

  return {
    success: true,
    message: 'Cleared astrology cache',
    deletedRows: deletedCount
  };
}

/**
 * Call astrology Lambda directly to calculate birth chart
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
async function calculateBirthChartDirect(userId) {
  try {
    // Import Lambda calculation function
    const { calculateBirthChart } = await import('../lambda-astrology.js');
    const { db } = await import('../../shared/db.js');
    
    // Fetch user's birth data from database
    const { rows } = await db.query(
      `SELECT 
        pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date,
        pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time,
        pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country,
        pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province,
        pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city,
        pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone
       FROM user_personal_info 
       WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );
    
    if (rows.length === 0) {
      console.warn(`[ASTROLOGY-SERVICE] No personal info found for user: ${userId.substring(0, 8)}`);
      return false;
    }
    
    const userData = rows[0];
    
    // Verify we have complete birth data
    if (!userData.birth_date || !userData.birth_time || !userData.birth_country || 
        !userData.birth_province || !userData.birth_city) {
      console.warn(`[ASTROLOGY-SERVICE] Incomplete birth data for user: ${userId.substring(0, 8)}`);
      return false;
    }
    
    // Call Lambda to calculate birth chart
    const result = await calculateBirthChart({
      birth_date: userData.birth_date,
      birth_time: userData.birth_time,
      birth_country: userData.birth_country,
      birth_province: userData.birth_province,
      birth_city: userData.birth_city,
      birth_timezone: userData.birth_timezone
    });
    
    if (!result.success) {
      console.error(`[ASTROLOGY-SERVICE] Birth chart calculation failed:`, result.error);
      return false;
    }
    
    // Save results to database
    const userIdHash = hashUserId(userId);
    const zodiacSign = result.sun_sign || calculateSunSignFromDate(userData.birth_date);
    
    await upsertAstrologyData(userIdHash, zodiacSign, result);
    return true;
  } catch (err) {
    logErrorFromCatch('[ASTROLOGY-SERVICE] Direct Lambda calculation failed:', err);
    return false;
  }
}

/**
 * Calculate full birth chart directly (skip Redis queue since worker is gone)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function enqueueFullBirthChart(userId) {
  try {
    // Delay to ensure write propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Call Lambda directly (worker is gone, so no more queuing)
    await calculateBirthChartDirect(userId);
  } catch (err) {
    logErrorFromCatch('[ASTROLOGY-SERVICE] Failed to calculate birth chart:', err);
  }
}
