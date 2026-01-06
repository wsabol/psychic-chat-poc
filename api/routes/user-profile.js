import { Router } from "express";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { validateAge } from "../shared/ageValidator.js";
import { handleAgeViolation } from "../shared/violationHandler.js";
import { encrypt } from "../utils/encryption.js";

const router = Router();

function parseDateForStorage(dateString) {
    if (!dateString) return null;
    try {
        const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
        const trimmed = dateString.trim();
        if (isoRegex.test(trimmed)) {
            return trimmed;
        }
        return null;
    } catch (e) {
        console.error('Date parsing error:', e, dateString);
        return null;
    }
}

router.get("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        const { rows } = await db.query(
            `SELECT pgp_sym_decrypt(first_name_encrypted, $1) as first_name, pgp_sym_decrypt(last_name_encrypted, $1) as last_name, pgp_sym_decrypt(email_encrypted, $1) as email, pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date, pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time, pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country, pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province, pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city, pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone, pgp_sym_decrypt(sex_encrypted, $1) as sex, pgp_sym_decrypt(familiar_name_encrypted, $1) as address_preference FROM user_personal_info WHERE user_id = $2`,
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

        const ageValidation = validateAge(parsedBirthDate);
        if (!ageValidation.isValid) {
            return res.status(400).json({ error: ageValidation.error });
        }

        if (!ageValidation.isAdult) {
            const violationResult = await handleAgeViolation(userId, ageValidation.age);

            if (violationResult.deleted) {
                return res.status(403).json({
                    error: 'Account has been terminated due to policy violation.',
                    reason: 'Users must be 18 years or older',
                    deleted: true
                });
            } else {
                return res.status(403).json({
                    error: ageValidation.error,
                    warning: 'This is your first age restriction warning. A second violation will result in account deletion.',
                    violationCount: violationResult.violationCount
                });
            }
        }

        const safeTime = birthTime && birthTime.trim() ? birthTime : null;
        const safeCountry = birthCountry && birthCountry.trim() ? birthCountry : null;
        const safeProvince = birthProvince && birthProvince.trim() ? birthProvince : null;
        const safeCity = birthCity && birthCity.trim() ? birthCity : null;
        const safeTimezone = birthTimezone && birthTimezone.trim() ? birthTimezone : null;
        const safeAddressPreference = addressPreference && addressPreference.trim() ? addressPreference : null;

        await db.query(
            `INSERT INTO user_personal_info 
             (user_id, first_name_encrypted, last_name_encrypted, email_encrypted, birth_date_encrypted, birth_time_encrypted, birth_country_encrypted, birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted, sex_encrypted, familiar_name_encrypted)
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
             familiar_name_encrypted = EXCLUDED.familiar_name_encrypted,
             updated_at = CURRENT_TIMESTAMP`,
            [process.env.ENCRYPTION_KEY, userId, firstName || 'Temporary', lastName || 'User', email, parsedBirthDate, safeTime, safeCountry, safeProvince, safeCity, safeTimezone, sex || 'Unspecified', safeAddressPreference]
        );

        try {
            const userIdHash = hashUserId(userId);
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id_hash = $1 
                 AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
                [userIdHash]
            );
        } catch (err) {
            console.warn(`Failed to clear cached insights for user ${userId}:`, err.message);
        }
        
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

        if (zodiacSign && astrologyData) {
            const userIdHash = hashUserId(userId);
            await db.query(
                `INSERT INTO user_astrology 
                 (user_id_hash, zodiac_sign, astrology_data)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id_hash) DO UPDATE SET
                 zodiac_sign = EXCLUDED.zodiac_sign,
                 astrology_data = EXCLUDED.astrology_data,
                 updated_at = CURRENT_TIMESTAMP`,
                [userIdHash, zodiacSign, JSON.stringify(astrologyData)]
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
        const userIdHash = hashUserId(userId);
        const result = await db.query(
            `DELETE FROM messages WHERE user_id_hash = $1 AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
            [userIdHash]
        );
        res.json({ success: true, message: `Cleared astrology cache`, deletedRows: result.rowCount });
    } catch (err) {
        console.error('Error clearing astrology cache:', err);
        res.status(500).json({ error: 'Failed to clear astrology cache', details: err.message });
    }
});

// Get user preferences
router.get("/:userId/preferences", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const userIdHash = hashUserId(userId);
    
    try {
        const { rows } = await db.query(
            `SELECT language, response_type, voice_enabled, COALESCE(voice_selected, 'sophia') as voice_selected FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        
        if (rows.length === 0) {
            return res.json({
                language: 'en-US',
                response_type: 'full',
                voice_enabled: true,
                voice_selected: 'sophia'
            });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching preferences:', err);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// Save user preferences
router.post("/:userId/preferences", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { language, response_type, voice_enabled, voice_selected, timezone } = req.body;
    const userIdHash = hashUserId(userId);
    
    try {
        if (!language || !response_type) {
            return res.status(400).json({ error: 'Missing required fields: language, response_type' });
        }
        
        if (!['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'].includes(language)) {
            return res.status(400).json({ error: 'Invalid language' });
        }
        
        if (!['full', 'brief'].includes(response_type)) {
            return res.status(400).json({ error: 'Invalid response_type' });
        }

        const validVoices = ['sophia', 'cassandra', 'meridian', 'leo'];
        const selectedVoice = validVoices.includes(voice_selected) ? voice_selected : 'sophia';
        
        const { rows } = await db.query(
            `INSERT INTO user_preferences (user_id_hash, language, response_type, voice_enabled, voice_selected, timezone)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id_hash) DO UPDATE SET
             language = EXCLUDED.language,
             response_type = EXCLUDED.response_type,
             voice_enabled = EXCLUDED.voice_enabled,
             voice_selected = EXCLUDED.voice_selected,
             timezone = EXCLUDED.timezone,
             updated_at = CURRENT_TIMESTAMP
             RETURNING language, response_type, voice_enabled, voice_selected, timezone`,
            [userIdHash, language, response_type, voice_enabled !== false, selectedVoice, timezone]
        );
        
        res.json({ success: true, preferences: rows[0] });
    } catch (err) {
        console.error('Error saving preferences:', err);
        res.status(500).json({ error: 'Failed to save preferences', details: err.message });
    }
});

export default router;
