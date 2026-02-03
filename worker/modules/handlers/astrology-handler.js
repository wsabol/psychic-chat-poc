import { db } from '../../shared/db.js';
import { calculateBirthChart } from '../astrology.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Handle system astrology calculation requests
 * Triggered by [SYSTEM] messages containing "birth chart"
 */
export async function handleAstrologyCalculation(userId) {
    try {
        console.log('[ASTROLOGY-HANDLER] Starting calculation for user:', userId);
        
        // Fetch user's personal information
        const { rows: personalInfoRows } = await db.query(`
            SELECT pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date, pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time, pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country, pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province, pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city, pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone
            FROM user_personal_info WHERE user_id = $2
        `, [process.env.ENCRYPTION_KEY, userId]);
        
        if (personalInfoRows.length === 0) {
            console.log('[ASTROLOGY-HANDLER] No personal info found for user:', userId);
            return;
        }
        
        const info = personalInfoRows[0];
        
        // Check if we have complete birth data (timezone is optional)
        if (!info.birth_date || !info.birth_time || !info.birth_country || !info.birth_province || !info.birth_city) {
            console.log('[ASTROLOGY-HANDLER] Missing required fields for user:', userId, {
                has_birth_date: !!info.birth_date,
                has_birth_time: !!info.birth_time,
                has_birth_country: !!info.birth_country,
                has_birth_province: !!info.birth_province,
                has_birth_city: !!info.birth_city
            });
            return;
        }
        
        // Use timezone if available, otherwise let astrology library determine it
        const chartData = {
            birth_date: info.birth_date,
            birth_time: info.birth_time,
            birth_country: info.birth_country,
            birth_province: info.birth_province,
            birth_city: info.birth_city
        };
        
        if (info.birth_timezone) {
            chartData.birth_timezone = info.birth_timezone;
        }
        
        // Calculate birth chart
        console.log('[ASTROLOGY-HANDLER] Calculating birth chart with data:', chartData);
        const calculatedChart = await calculateBirthChart(chartData);
        console.log('[ASTROLOGY-HANDLER] Lambda response:', JSON.stringify(calculatedChart, null, 2));
        
        // Verify calculation was successful
        if (!calculatedChart.success || !calculatedChart.rising_sign || !calculatedChart.moon_sign) {
            console.error('[ASTROLOGY-HANDLER] Calculation failed or missing data:', {
                success: calculatedChart.success,
                has_rising_sign: !!calculatedChart.rising_sign,
                has_moon_sign: !!calculatedChart.moon_sign,
                error: calculatedChart.error
            });
            return;
        }
        
        // Store calculated birth chart data only
        const astrologyData = {
            rising_sign: calculatedChart.rising_sign,
            rising_degree: calculatedChart.rising_degree,
            moon_sign: calculatedChart.moon_sign,
            moon_degree: calculatedChart.moon_degree,
            sun_sign: calculatedChart.sun_sign,
            sun_degree: calculatedChart.sun_degree,
            north_node_sign: calculatedChart.north_node_sign,
            north_node_degree: calculatedChart.north_node_degree,
            south_node_sign: calculatedChart.south_node_sign,
            south_node_degree: calculatedChart.south_node_degree,
            latitude: calculatedChart.latitude,
            longitude: calculatedChart.longitude,
            timezone: calculatedChart.timezone,
            calculated_at: new Date().toISOString()
        };
        
        // Store in database with verification
        const userIdHash = hashUserId(userId);
        console.log('[ASTROLOGY-HANDLER] Saving astrology data to database for user:', userId);
        await db.query(
            `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id_hash) DO UPDATE SET
            astrology_data = EXCLUDED.astrology_data,
            updated_at = CURRENT_TIMESTAMP`,
            [userIdHash, calculatedChart.sun_sign, JSON.stringify(astrologyData)]
        );

        // CRITICAL: Verify data is safely saved before completing
        const { rows: verifyRows } = await db.query(
            `SELECT astrology_data FROM user_astrology WHERE user_id_hash = $1`,
            [userIdHash]
        );

        if (verifyRows.length === 0) {
            console.error('[ASTROLOGY-HANDLER] Failed to verify birth chart save for user:', userId);
            logErrorFromCatch('[ASTROLOGY-HANDLER] Failed to verify birth chart save for user:', userId);
            return;
        }
        
        console.log('[ASTROLOGY-HANDLER] Successfully saved and verified astrology data for user:', userId);
        
    } catch (err) {
        logErrorFromCatch(err, '[ASTROLOGY-HANDLER] Error calculating birth chart');
    }
}

/**
 * Check if message is an astrology calculation request
 */
export function isAstrologyRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('birth chart');
}

