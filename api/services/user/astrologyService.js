/**
 * Astrology Service
 * Business logic for astrology data and calculations
 */

import { hashUserId } from '../../shared/hashUtils.js';
import { calculateSunSignFromDate } from '../../shared/zodiacUtils.js';
import { enqueueMessage } from '../../shared/queue.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
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
 * Enqueue full birth chart calculation if complete data available
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function enqueueFullBirthChart(userId) {
  try {
    // Delay to ensure write propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    await enqueueMessage({
      userId,
      message: '[SYSTEM] Calculate my birth chart with rising sign and moon sign.'
    });
  } catch (err) {
    logErrorFromCatch('[ASTROLOGY-SERVICE] Failed to enqueue birth chart calculation:', err.message);
  }
}
