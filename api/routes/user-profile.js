import { Router } from "express";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { enqueueMessage } from "../shared/queue.js";

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

router.get("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        const { rows } = await db.query(
            `SELECT pgp_sym_decrypt(first_name_encrypted, $1) as first_name, pgp_sym_decrypt(last_name_encrypted, $1) as last_name, pgp_sym_decrypt(email_encrypted, $1) as email, pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date, pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time, pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country, pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province, pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city, pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone, pgp_sym_decrypt(sex_encrypted, $1) as sex, pgp_sym_decrypt(address_preference_encrypted, $1) as address_preference FROM user_personal_info WHERE user_id = $2`,
            [process.env.ENCRYPTION_KEY, userId]
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

router.post("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { firstName, lastName, email, birthDate, birthTime, birthCountry, birthProvince, birthCity, birthTimezone, sex, addressPreference, zodiacSign, astrologyData } = req.body;

    try {
        const isTemporary = email && email.startsWith('tempuser');
        
        if (!isTemporary && (!firstName || !lastName || !email || !birthDate || !sex)) {
            return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email, birthDate, sex' });
        }

        if (!email || !birthDate) {
            return res.status(400).json({ error: 'Missing required fields: email, birthDate' });
        }

        const parsedBirthDate = parseDateForStorage(birthDate);
        
        if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
            return res.status(400).json({ error: 'Invalid birth date format' });
        }

        const safeTime = birthTime && birthTime.trim() ? birthTime : null;
        const safeCountry = birthCountry && birthCountry.trim() ? birthCountry : null;
        const safeProvince = birthProvince && birthProvince.trim() ? birthProvince : null;
        const safeCity = birthCity && birthCity.trim() ? birthCity : null;
        const safeTimezone = birthTimezone && birthTimezone.trim() ? birthTimezone : null;
        const safeAddressPreference = addressPreference && addressPreference.trim() ? addressPreference : null;

        // Save personal info with encryption
        await db.query(
            `INSERT INTO user_personal_info 
             (user_id, first_name_encrypted, last_name_encrypted, email_encrypted, birth_date_encrypted, birth_time_encrypted, birth_country_encrypted, birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted, sex_encrypted, address_preference_encrypted)
             VALUES ($2, pgp_sym_encrypt($3, $1), pgp_sym_encrypt($4, $1), pgp_sym_encrypt($5, $1), pgp_sym_encrypt($6, $1), pgp_sym_encrypt($7, $1), pgp_sym_encrypt($8, $1), pgp_sym_encrypt($9, $1), pgp_sym_encrypt($10, $1), pgp_sym_encrypt($11, $1), pgp_sym_encrypt($12, $1), pgp_sym_encrypt($13, $1))
             ON CONFLICT (user_id) DO UPDATE SET
             first_name_encrypted = EXCLUDED.first_name_encrypted,
             last_name_encrypted = EXCLUDED.last_name_encrypted,
             email_encrypted = EXCLUDED.email_encrypted,
             birth_date_encrypted = EXCLUDED.birth_date_encrypted,
             birth_time_encrypted = EXCLUDED.birth_time_encrypted,
             birth_country_encrypted = EXCLUDED.birth_country_encrypted,
             birth_province_encrypted = EXCLUDED.birth_province_encrypted,
             birth_city_encrypted = EXCLUDED.birth_city_encrypted,
             birth_timezone_encrypted = EXCLUDED.birth_timezone_encrypted,
             sex_encrypted = EXCLUDED.sex_encrypted,
             address_preference_encrypted = EXCLUDED.address_preference_encrypted,
             updated_at = CURRENT_TIMESTAMP`,
            [process.env.ENCRYPTION_KEY, userId, firstName || 'Temporary', lastName || 'User', email, parsedBirthDate, safeTime, safeCountry, safeProvince, safeCity, safeTimezone, sex || 'Unspecified', safeAddressPreference]
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
        if (safeTime && safeCountry && safeProvince && safeCity && parsedBirthDate) {
            try {
                await enqueueMessage({
                    userId,
                    message: '[SYSTEM] Calculate my birth chart with rising sign and moon sign.'
                });
            } catch (err) {
                console.error('Error enqueueing astrology calculation:', err);
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

router.delete("/:userId/astrology-cache", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await db.query(
            `DELETE FROM messages WHERE user_id = $1 AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
            [userId]
        );
        res.json({ success: true, message: `Cleared astrology cache`, deletedRows: result.rowCount });
    } catch (err) {
        console.error('Error clearing astrology cache:', err);
        res.status(500).json({ error: 'Failed to clear astrology cache', details: err.message });
    }
});

export default router;
