import { db } from '../../shared/db.js';
import { calculateBirthChart } from '../astrology.js';
import { hashUserId } from '../../shared/hashUtils.js';

/**
 * Handle system astrology calculation requests
 * Triggered by [SYSTEM] messages containing "birth chart"
 */
export async function handleAstrologyCalculation(userId) {
    try {
        console.log('[ASTROLOGY-HANDLER] Starting calculation for user:', userId);
        console.log('[ASTROLOGY-HANDLER] Using ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'SET' : 'NOT SET');
        
        // Fetch user's personal information
        const { rows: personalInfoRows } = await db.query(`
            SELECT pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date, pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time, pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country, pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province, pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city, pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone
            FROM user_personal_info WHERE user_id = $2
        `, [process.env.ENCRYPTION_KEY, userId]);
        
        if (personalInfoRows.length === 0) {
            console.warn('[ASTROLOGY-HANDLER] No personal info found for user', userId);
            return;
        }
        
        const info = personalInfoRows[0];
        console.log('[ASTROLOGY-HANDLER] Decrypted birth data:', {
            birth_date: info.birth_date,
            birth_time: info.birth_time,
            birth_country: info.birth_country,
            birth_province: info.birth_province,
            birth_city: info.birth_city,
            birth_timezone: info.birth_timezone
        });
        
        // Check if we have complete birth data (timezone is optional)
        if (!info.birth_date || !info.birth_time || !info.birth_country || !info.birth_province || !info.birth_city) {
            console.warn('[ASTROLOGY-HANDLER] Incomplete birth data for user', userId);
            console.warn('[ASTROLOGY-HANDLER] Missing fields:', {
                birth_date: !info.birth_date,
                birth_time: !info.birth_time,
                birth_country: !info.birth_country,
                birth_province: !info.birth_province,
                birth_city: !info.birth_city
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
        
        console.log('[ASTROLOGY-HANDLER] Passing to Python script:', JSON.stringify(chartData));
        
        // Calculate birth chart
        const calculatedChart = await calculateBirthChart(chartData);
        
        console.log('[ASTROLOGY-HANDLER] Python returned:', JSON.stringify(calculatedChart));
        
        // Verify calculation was successful
        if (!calculatedChart.success || !calculatedChart.rising_sign || !calculatedChart.moon_sign) {
            console.warn('[ASTROLOGY-HANDLER] Birth chart calculation failed:', calculatedChart.error);
            return;
        }
        
        console.log('[ASTROLOGY-HANDLER] Calculation successful! Storing data...');
        
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
        
        // Store in database
        const userIdHash = hashUserId(userId);
        await db.query(
            `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id_hash) DO UPDATE SET
            astrology_data = EXCLUDED.astrology_data,
            updated_at = CURRENT_TIMESTAMP`,
            [userIdHash, calculatedChart.sun_sign, JSON.stringify(astrologyData)]
        );
        
        console.log('[ASTROLOGY-HANDLER] ✅ Astrology data stored successfully for user:', userId);
        
    } catch (err) {
        console.error('[ASTROLOGY-HANDLER] Error:', err.message, err);
    }
}

/**
 * Check if message is an astrology calculation request
 */
export function isAstrologyRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('birth chart');
}
