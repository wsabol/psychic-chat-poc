import { Router } from "express";
import { db } from "../shared/db.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";

const router = Router();

function parseDateForStorage(dateString) {
    if (!dateString) return null;
    try {
        const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
        const parts = dateString.trim().split('-');
        if (parts.length !== 3) return dateString;
        
        const day = parts[0].trim().padStart(2, '0');
        const monthStr = parts[1].trim();
        const month = months[monthStr];
        const year = parts[2].trim();
        
        if (!month) {
            return dateString;
        }
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('Date parsing error:', e, dateString);
        return dateString;
    }
}

router.get("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        const { rows } = await db.query(
            "SELECT first_name, last_name, email, to_char(birth_date, 'YYYY-MM-DD') AS birth_date, birth_time, birth_country, birth_province, birth_city, birth_timezone, sex, address_preference FROM user_personal_info WHERE user_id = $1",
            [userId]
        );
        if (rows.length === 0) {
            return res.json({});
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching personal info:', err);
        res.status(500).json({ error: 'Failed to fetch personal information' });
    }
});

router.post("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { firstName, lastName, email, birthDate, birthTime, birthCountry, birthProvince, birthCity, birthTimezone, sex, addressPreference, zodiacSign, astrologyData } = req.body;

    try {
        if (!firstName || !lastName || !email || !birthDate || !sex) {
    
            return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email, birthDate, sex' });
        }

        const parsedBirthDate = parseDateForStorage(birthDate);
        
        if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
    
            return res.status(400).json({ error: 'Invalid birth date format' });
        }

        await db.query(
            `INSERT INTO user_personal_info 
             (user_id, first_name, last_name, email, birth_date, birth_time, birth_country, birth_province, birth_city, birth_timezone, sex, address_preference)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (user_id) DO UPDATE SET
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             email = EXCLUDED.email,
             birth_date = EXCLUDED.birth_date,
             birth_time = EXCLUDED.birth_time,
             birth_country = EXCLUDED.birth_country,
             birth_province = EXCLUDED.birth_province,
             birth_city = EXCLUDED.birth_city,
             birth_timezone = EXCLUDED.birth_timezone,
             sex = EXCLUDED.sex,
             address_preference = EXCLUDED.address_preference,
             updated_at = CURRENT_TIMESTAMP`,
            [userId, firstName, lastName, email, parsedBirthDate, birthTime, birthCountry, birthProvince, birthCity, birthTimezone, sex, addressPreference]
        );

        // Clear cached horoscopes and astrology insights since birth data changed
        try {
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id = $1 
                 AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
                [userId]
            );
        } catch (err) {
            console.warn(`Failed to clear cached insights for user ${userId}:`, err.message);
        }
        
        // Trigger astrology calculation via worker if complete birth data
        if (birthTime && birthCountry && birthProvince && birthCity && parsedBirthDate) {
            try {
                await enqueueMessage({
                    userId,
                    message: '[SYSTEM] Calculate my birth chart with rising sign and moon sign.'
                });
            } catch (err) {
                // Silently continue if astrology enqueue fails
            }
        }

        // Handle provided astrology data
        if (zodiacSign && astrologyData) {
            await db.query(
                `INSERT INTO user_astrology 
                 (user_id, zodiac_sign, astrology_data)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id) DO UPDATE SET
                 zodiac_sign = EXCLUDED.zodiac_sign,
                 astrology_data = EXCLUDED.astrology_data,
                 updated_at = CURRENT_TIMESTAMP`,
                [userId, zodiacSign, JSON.stringify(astrologyData)]
            );
        }

        res.json({ success: true, message: "Personal information saved successfully" });
    } catch (err) {
        console.error('Error saving personal info:', err);
        res.status(500).json({ error: 'Failed to save personal information', details: err.message });
    }
});

export default router;
