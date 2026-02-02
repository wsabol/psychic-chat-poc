/**
 * Astrology Setup Utility
 * Calculates and stores birth chart if not already available
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { calculateBirthChart } from '../astrology.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Ensure user has astrology data, calculating if necessary
 * Returns updated astrology info if calculated, original if already exists
 * 
 * @param {object} userInfo - User personal info
 * @param {object} astrologyInfo - Current astrology info (may be null)
 * @param {string} userId - User ID for storage
 * @returns {Promise<object|null>} - Updated astrology info or original
 */
export async function ensureUserAstrology(userInfo, astrologyInfo, userId) {
    try {
        // If astrology already exists, return as-is
        if (astrologyInfo) {
            return astrologyInfo;
        }

        // Check if we have birth data to calculate
        if (!userInfo?.birth_date || !userInfo?.birth_time || !userInfo?.birth_country || 
            !userInfo?.birth_province || !userInfo?.birth_city) {
            // Not enough data to calculate, return null
            return null;
        }

        // Calculate birth chart
        const calculatedChart = await calculateBirthChart({
            birth_date: userInfo.birth_date,
            birth_time: userInfo.birth_time,
            birth_country: userInfo.birth_country,
            birth_province: userInfo.birth_province,
            birth_city: userInfo.birth_city,
            birth_timezone: userInfo.birth_timezone
        });

        // Check if calculation was successful
        if (!calculatedChart.success || !calculatedChart.rising_sign || !calculatedChart.moon_sign) {
            return null;
        }

        // Build astrology data object
        const astrologyData = {
            rising_sign: calculatedChart.rising_sign,
            rising_degree: calculatedChart.rising_degree,
            moon_sign: calculatedChart.moon_sign,
            moon_degree: calculatedChart.moon_degree,
            sun_sign: calculatedChart.sun_sign,
            sun_degree: calculatedChart.sun_degree,
            latitude: calculatedChart.latitude,
            longitude: calculatedChart.longitude,
            timezone: calculatedChart.timezone,
            calculated_at: new Date().toISOString()
        };

        // Store in database
        await storeAstrologyData(userId, calculatedChart.sun_sign, astrologyData);

        // Return new astrology info
        return {
            zodiac_sign: calculatedChart.sun_sign,
            astrology_data: astrologyData
        };
    } catch (err) {
        // Return null on error, allow chat to proceed without astrology
        return null;
    }
}

/**
 * Store astrology data in database
 */
async function storeAstrologyData(userId, sunSign, astrologyData) {
    try {
        const userIdHash = hashUserId(userId);
        await db.query(
            `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id_hash) DO UPDATE SET
             astrology_data = EXCLUDED.astrology_data,
             updated_at = CURRENT_TIMESTAMP`,
            [userIdHash, sunSign, JSON.stringify(astrologyData)]
        );
    } catch (err) {
        logErrorFromCatch('[ASTROLOGY-SETUP] Error storing astrology:', err.message);
        throw err;
    }
}

