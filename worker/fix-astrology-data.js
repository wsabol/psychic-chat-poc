#!/usr/bin/env node
/**
 * Fix astrology data by recalculating and merging birth chart data
 * This script recalculates the birth chart and merges it with enrichment data
 */

import { db } from './shared/db.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Calculate birth chart using Python script
 */
async function calculateBirthChart(birthData) {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', ['./astrology.py']);
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => {
            outputData += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            errorData += data.toString();
            console.error('[PYTHON ERROR]', data.toString());
        });
        
        python.on('close', (code) => {
            if (code !== 0) {
                console.error('[ASTROLOGY] Python script failed:', errorData);
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            try {
                const result = JSON.parse(outputData);
                resolve(result);
            } catch (e) {
                console.error('[ASTROLOGY] Failed to parse result:', outputData);
                reject(new Error(`Invalid JSON from astrology script: ${e.message}`));
            }
        });
        
        python.on('error', (err) => {
            console.error('[ASTROLOGY] Failed to spawn Python:', err);
            reject(err);
        });
        
        python.stdin.write(JSON.stringify(birthData));
        python.stdin.end();
    });
}

/**
 * Main function to fix astrology data
 */
async function fixAstrologyData() {
    try {
        console.log('[FIX-ASTROLOGY] Starting astrology data fix...');
        
        // Get all users with astrology data but missing birth chart data
        const { rows } = await db.query(
            `SELECT user_id, zodiac_sign, astrology_data FROM user_astrology 
             WHERE astrology_data ->> 'sun_sign' IS NULL`
        );
        
        console.log(`[FIX-ASTROLOGY] Found ${rows.length} users with incomplete astrology data`);
        
        for (const row of rows) {
            const userId = row.user_id;
            console.log(`\n[FIX-ASTROLOGY] Processing user: ${userId}`);
            
            try {
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
                
                if (!personalInfoRows.length) {
                    console.log(`[FIX-ASTROLOGY] No personal info found for ${userId}, skipping`);
                    continue;
                }
                
                const info = personalInfoRows[0];
                
                // Validate complete birth data
                if (!info.birth_date || !info.birth_time || !info.birth_country || !info.birth_province || !info.birth_city) {
                    console.log(`[FIX-ASTROLOGY] Incomplete birth information for ${userId}, skipping`);
                    continue;
                }
                
                console.log(`[FIX-ASTROLOGY] Calculating birth chart for ${userId}...`);
                
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
                    console.error(`[FIX-ASTROLOGY] Calculation failed for ${userId}:`, calculatedChart.error);
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
                
                console.log(`[FIX-ASTROLOGY] ✅ Fixed ${userId}:`);
                console.log(`  - Sun: ${calculatedChart.sun_sign} (${calculatedChart.sun_degree}°)`);
                console.log(`  - Moon: ${calculatedChart.moon_sign} (${calculatedChart.moon_degree}°)`);
                console.log(`  - Rising: ${calculatedChart.rising_sign} (${calculatedChart.rising_degree}°)`);
                
            } catch (err) {
                console.error(`[FIX-ASTROLOGY] Error processing user ${userId}:`, err.message);
            }
        }
        
        console.log(`\n[FIX-ASTROLOGY] ✅ Astrology data fix completed!`);
        process.exit(0);
        
    } catch (err) {
        console.error('[FIX-ASTROLOGY] Fatal error:', err.message);
        process.exit(1);
    }
}

// Run the fix
fixAstrologyData();
