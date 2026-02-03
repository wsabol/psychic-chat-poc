/**
 * Fix astrology data by recalculating and merging birth chart data
 * This script recalculates the birth chart and merges it with enrichment data
 */

import { db } from './shared/db.js';
import { calculateBirthChart } from './modules/astrology.js';
import { logErrorFromCatch } from './shared/errorLogger.js';
import { hashUserId } from './shared/hashUtils.js';

/**
 * Main function to fix astrology data
 */
async function fixAstrologyData() {
    try {
        console.log('[FIX-ASTROLOGY] Starting astrology data fix...');
        
        // Get all users with incomplete astrology data
        const { rows } = await db.query(
            `SELECT ua.user_id_hash, ua.zodiac_sign, ua.astrology_data, upi.user_id
             FROM user_astrology ua
             INNER JOIN user_personal_info upi ON ENCODE(DIGEST(upi.user_id, 'sha256'), 'hex') = ua.user_id_hash
             WHERE ua.astrology_data ->> 'moon_sign' IS NULL 
             OR ua.astrology_data ->> 'rising_sign' IS NULL
             OR ua.astrology_data ->> 'sun_degree' = '0'`
        );
        
        console.log(`[FIX-ASTROLOGY] Found ${rows.length} users with incomplete astrology data`);
        
        for (const row of rows) {
            const userId = row.user_id;
            const userIdHash = row.user_id_hash;
            
            try {
                console.log(`[FIX-ASTROLOGY] Processing user: ${userId}`);
                
                // Fetch user's personal information (encrypted)
                const { rows: personalInfoRows } = await db.query(
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
                
                if (personalInfoRows.length === 0) {
                    console.log(`[FIX-ASTROLOGY] No personal info found for ${userId}`);
                    continue;
                }
                
                const info = personalInfoRows[0];
                
                // Validate complete birth data
                if (!info.birth_date || !info.birth_time || !info.birth_country || !info.birth_province || !info.birth_city) {
                    continue;
                }
                
                // Calculate birth chart
                const calculatedChart = await calculateBirthChart({
                    birth_date: info.birth_date,
                    birth_time: info.birth_time,
                    birth_country: info.birth_country,
                    birth_province: info.birth_province,
                    birth_city: info.birth_city,
                    birth_timezone: info.birth_timezone
                });
                
                if (!calculatedChart.success || !calculatedChart.rising_sign || !calculatedChart.moon_sign) {
                    logErrorFromCatch(`[FIX-ASTROLOGY] Calculation failed for ${userId}:`, calculatedChart.error);
                    continue;
                }
                
                // Merge with existing enrichment data
                const existingData = typeof row.astrology_data === 'string' 
                    ? JSON.parse(row.astrology_data) 
                    : row.astrology_data;
                
                const mergedData = {
                    // Birth chart data (CRITICAL)
                    sun_sign: calculatedChart.sun_sign,
                    sun_degree: calculatedChart.sun_degree,
                    moon_sign: calculatedChart.moon_sign,
                    moon_degree: calculatedChart.moon_degree,
                    rising_sign: calculatedChart.rising_sign,
                    rising_degree: calculatedChart.rising_degree,
                    latitude: calculatedChart.latitude,
                    longitude: calculatedChart.longitude,
                    timezone: calculatedChart.timezone,
                    calculated_at: new Date().toISOString(),
                    
                    // Enrichment data (keep existing)
                    ...existingData
                };
                
                // Update database
                await db.query(
                    `UPDATE user_astrology 
                     SET astrology_data = $1, updated_at = CURRENT_TIMESTAMP 
                     WHERE user_id = $2`,
                    [JSON.stringify(mergedData), userId]
                );
                
            } catch (err) {
                logErrorFromCatch(`[FIX-ASTROLOGY] Error processing user ${userId}:`, err.message);
            }
        }
        
    } catch (err) {
        logErrorFromCatch('[FIX-ASTROLOGY] Fatal error:', err.message);
        process.exit(1);
    }
}

// Run the fix
fixAstrologyData();
