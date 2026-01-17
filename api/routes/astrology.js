import express from 'express';
const router = express.Router();
import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import { enqueueMessage } from '../shared/queue.js';
import { authorizeUser } from '../middleware/auth.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { validationError, notFoundError, serverError } from '../utils/responses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function calculateBirthChartSync(birthData) {
    return new Promise((resolve, reject) => {
        const workerDir = path.join(__dirname, '../..', 'worker');
        const python = spawn('python3', ['./astrology.py'], { cwd: workerDir });
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => {
            outputData += data.toString();
        });
        
                python.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            try {
                const result = JSON.parse(outputData);
                resolve(result);
            } catch (e) {
                reject(new Error(`Invalid JSON from astrology script: ${e.message}`));
            }
                });
        
        python.on('error', (err) => {
            reject(err);
        });
        
        python.stdin.write(JSON.stringify(birthData));
        python.stdin.end();
    });
}

router.post('/validate-location', authorizeUser, async (req, res) => {
    try {
        const { birth_city, birth_province, birth_country, birth_date, birth_time } = req.body;
        
        if (!birth_city || !birth_province || !birth_country || !birth_date) {
            return validationError(res, 'Required fields: birth_city, birth_province, birth_country, birth_date');
        }
        
        const result = await calculateBirthChartSync({
            birth_date: birth_date,
            birth_time: birth_time || '12:00:00',
            birth_country: birth_country,
            birth_province: birth_province,
            birth_city: birth_city
        });
        
        if (result.location_error) {
            return res.json({
                success: false,
                location_error: result.location_error,
                warnings: result.warnings || []
            });
        }
        
        if (result.warnings && result.warnings.length > 0) {
            return res.json({
                success: true,
                warnings: result.warnings,
                latitude: result.latitude,
                longitude: result.longitude
            });
        }
        
        if (result.success && result.latitude && result.longitude) {
            return res.json({
                success: true,
                latitude: result.latitude,
                longitude: result.longitude,
                timezone: result.timezone
            });
        }
        
                return res.json({
            success: false,
            location_error: result.error || 'Could not verify location',
            warnings: result.warnings || []
        });
    } catch (err) {
        return res.json({
            success: false,
            error: 'Location validation service unavailable',
            details: err.message
        });
    }
});

// POST endpoint to calculate astrology synchronously
router.post('/sync-calculate/:userId', authorizeUser, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Fetch user's personal information (decrypted)
                let personalInfoRows = [];
        let retries = 0;
        
        // RETRY LOOP: Wait for personal info to persist in database
        while (!personalInfoRows.length && retries < 5) {
            const result = await db.query(
                `SELECT pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date,
                        pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time,
                        pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country,
                        pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province,
                        pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city
                 FROM user_personal_info WHERE user_id = $2`,
                [process.env.ENCRYPTION_KEY, userId]
            );
            personalInfoRows = result.rows;
            if (!personalInfoRows.length && retries < 4) {
                await new Promise(r => setTimeout(r, 500));
                retries++;
            }
        }
        
        if (!personalInfoRows.length) {
            return notFoundError(res, 'Personal information not found');
        }
        
        const info = personalInfoRows[0];
        
        // Validate birth data (timezone is optional, defaults to UTC)
                if (!info.birth_date || !info.birth_time || !info.birth_country || !info.birth_province || !info.birth_city) {
            return validationError(res, 'Incomplete birth information');
        }
        
                // DEBUG: Log input data
        const birthInputData = {
            birth_date: info.birth_date,
            birth_time: info.birth_time,
            birth_country: info.birth_country,
            birth_province: info.birth_province,
            birth_city: info.birth_city
                };
        console.log('[ASTROLOGY] Sending to Python:', JSON.stringify(birthInputData, null, 2));
        const calculatedChart = await calculateBirthChartSync(birthInputData);
        console.log('[ASTROLOGY] Python returned:', JSON.stringify(calculatedChart, null, 2));
        
        // STRICT: All three signs required
        if (!calculatedChart.success || !calculatedChart.sun_sign || !calculatedChart.moon_sign || !calculatedChart.rising_sign) {
            const errorMsg = calculatedChart.location_error || calculatedChart.error || 'Astrology calculation failed - could not find your birth location';
            return serverError(res, errorMsg);
        }
        
        // Store in database
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
        
        const userIdHash = hashUserId(userId);
        await db.query(
            `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id_hash) DO UPDATE SET
             astrology_data = EXCLUDED.astrology_data,
             updated_at = CURRENT_TIMESTAMP`,
            [userIdHash, calculatedChart.sun_sign, JSON.stringify(astrologyData)]
        );
        
                // CRITICAL: Verify data is safely saved before returning success
        const { rows: verifyRows } = await db.query(
            `SELECT astrology_data FROM user_astrology WHERE user_id_hash = $1`,
            [userIdHash]
        );

        if (verifyRows.length === 0) {
            return serverError(res, 'Failed to confirm astrology data was saved');
        }
        
        res.json({
            success: true,
            message: 'Astrology calculated and stored',
            data: astrologyData
        });
    } catch (err) {
        return serverError(res, 'Failed to calculate astrology');
    }
});

router.post('/calculate/:userId', authorizeUser, async (req, res) => {
    try {
        const { userId } = req.params;
        
        await enqueueMessage({ 
            userId, 
            message: '[SYSTEM] Calculate my rising sign and moon sign based on my birth information.'
        });
        
        res.json({ status: 'Astrology calculation job enqueued', userId });
    } catch (error) {
        return serverError(res, 'Failed to enqueue astrology calculation');
    }
});

router.get("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query(
            "SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id_hash = $1",
            [userIdHash]
        );
        if (rows.length === 0) {
            return notFoundError(res, 'No astrology data found');
        }
        
        const result = rows[0];
        if (typeof result.astrology_data === 'string') {
            result.astrology_data = JSON.parse(result.astrology_data);
        }
        
        if (result.zodiac_sign && !result.astrology_data.sun_sign) {
            result.astrology_data.sun_sign = result.zodiac_sign;
        }
        
        res.json(result);
    } catch (err) {
        return serverError(res, 'Failed to fetch astrology data');
    }
});

router.post("/:userId", async (req, res) => {
    const { userId } = req.params;
    const { risingSign, moonSign, astrology_data } = req.body;
    
    try {
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query(
            "SELECT astrology_data FROM user_astrology WHERE user_id_hash = $1",
            [userIdHash]
        );
        
        if (rows.length === 0) {
            return notFoundError(res, 'No astrology data found');
        }
        
        let existingData = rows[0].astrology_data;
        if (typeof existingData === 'string') {
            existingData = JSON.parse(existingData);
        }
        
        const updatedData = { ...existingData };
        if (risingSign) updatedData.risingSign = risingSign;
        if (moonSign) updatedData.moonSign = moonSign;
        if (astrology_data) {
            Object.assign(updatedData, astrology_data);
        }
        
        await db.query(
            "UPDATE user_astrology SET astrology_data = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id_hash = $2",
            [JSON.stringify(updatedData), userIdHash]
        );
        
        res.json({ success: true, message: "Astrology data updated successfully", data: updatedData });
    } catch (err) {
        return serverError(res, 'Failed to update astrology data');
    }
});

export default router;
