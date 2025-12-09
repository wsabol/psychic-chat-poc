import express from 'express';
const router = express.Router();
import { db } from '../shared/db.js';
import { enqueueMessage } from '../shared/queue.js';
import { authorizeUser } from '../middleware/auth.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to calculate birth chart synchronously via Python script
// EXPORTED for use in other routes
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

// POST endpoint to calculate astrology for user (synchronous)
// Called when personal info is saved
router.post('/sync-calculate/:userId', authorizeUser, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Fetch user's personal information (decrypted)
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
            return res.status(404).json({ error: 'Personal info not found' });
        }
        
        const info = personalInfoRows[0];
        
        // Validate complete birth data
        if (!info.birth_date || !info.birth_time || !info.birth_country || !info.birth_province || !info.birth_city) {
            return res.status(400).json({ error: 'Incomplete birth information' });
        }
        
        // Calculate birth chart
        const calculatedChart = await calculateBirthChartSync({
            birth_date: info.birth_date,
            birth_time: info.birth_time,
            birth_country: info.birth_country,
            birth_province: info.birth_province,
            birth_city: info.birth_city,
            birth_timezone: info.birth_timezone
        });
        
        if (!calculatedChart.success || !calculatedChart.rising_sign || !calculatedChart.moon_sign) {
            return res.status(500).json({ error: calculatedChart.error || 'Calculation failed' });
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
        
        await db.query(
            `INSERT INTO user_astrology (user_id, zodiac_sign, astrology_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
             astrology_data = EXCLUDED.astrology_data,
             updated_at = CURRENT_TIMESTAMP`,
            [userId, calculatedChart.sun_sign, JSON.stringify(astrologyData)]
        );
        
        res.json({
            success: true,
            message: 'Astrology calculated and stored',
            data: astrologyData
        });
    } catch (err) {
        console.error('[ASTROLOGY] Error calculating:', err);
        res.status(500).json({ error: 'Calculation failed', details: err.message });
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
        console.error('Error enqueueing astrology calculation:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

router.get("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        const { rows } = await db.query(
            "SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id = $1",
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No astrology data found for this user' });
        }
        
        const result = rows[0];
        if (typeof result.astrology_data === 'string') {
            result.astrology_data = JSON.parse(result.astrology_data);
        }
        
        res.json(result);
    } catch (err) {
        console.error('Error fetching astrology info:', err);
        res.status(500).json({ error: 'Failed to fetch astrology information' });
    }
});

router.post("/:userId", async (req, res) => {
    const { userId } = req.params;
    const { risingSign, moonSign, astrology_data } = req.body;
    
    try {
        const { rows } = await db.query(
            "SELECT astrology_data FROM user_astrology WHERE user_id = $1",
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No astrology data found for this user' });
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
            "UPDATE user_astrology SET astrology_data = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
            [JSON.stringify(updatedData), userId]
        );
        
        res.json({ success: true, message: "Astrology data updated successfully", data: updatedData });
    } catch (err) {
        console.error('Error updating astrology data:', err);
        res.status(500).json({ error: 'Failed to update astrology data' });
    }
});

export default router;
