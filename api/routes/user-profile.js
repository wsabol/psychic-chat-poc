import { Router } from "express";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { validateAge } from "../shared/ageValidator.js";
import { handleAgeViolation } from "../shared/violationHandler.js";
import { validationError, forbiddenError, serverError } from "../utils/responses.js";
import { calculateSunSignFromDate } from "../shared/zodiacUtils.js";

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
        return serverError(res, 'Failed to fetch personal information');
    }
});

router.post("/:userId", authorizeUser, async (req, res) => {

    const { userId } = req.params;
    const { firstName, lastName, email, birthDate, birthTime, birthCountry, birthProvince, birthCity, birthTimezone, sex, addressPreference, zodiacSign, astrologyData } = req.body;

    try {
        const isTemporary = email && email.startsWith('tempuser');
        
        if (!isTemporary && (!firstName || !lastName || !email || !birthDate || !sex)) {
            return validationError(res, 'Missing required fields: firstName, lastName, email, birthDate, sex');
        }

        if (!email || !birthDate) {
            return validationError(res, 'Missing required fields: email, birthDate');
        }

        const parsedBirthDate = parseDateForStorage(birthDate);
        
        if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
            return validationError(res, 'Invalid birth date format');
        }

        const ageValidation = validateAge(parsedBirthDate);
        if (!ageValidation.isValid) {
            return validationError(res, ageValidation.error + ' (This app requires users to be 18 years or older)');
        }

        // CRITICAL: Age >= 18 is a legal requirement - allow 3 attempts to fix typos
        if (!ageValidation.isAdult) {
            const violationResult = await handleAgeViolation(userId, ageValidation.age);

            if (violationResult.deleted) {
                // All 3 attempts used - account is deleted
                return forbiddenError(res, violationResult.error);
            } else {
                // Still allow attempts - provide clear feedback about attempts remaining
                return forbiddenError(res, violationResult.message);
            }
        }

        const safeTime = birthTime && birthTime.trim() ? birthTime : null;
        const safeCountry = birthCountry && birthCountry.trim() ? birthCountry : null;
        const safeProvince = birthProvince && birthProvince.trim() ? birthProvince : null;
        const safeCity = birthCity && birthCity.trim() ? birthCity : null;
        const safeTimezone = birthTimezone && birthTimezone.trim() ? birthTimezone : null;
        const safeAddressPreference = addressPreference && addressPreference.trim() ? addressPreference : null;

                // Save personal information
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

        // CRITICAL: Verify data is safely saved before proceeding
        // Read-after-write confirmation ensures transaction is committed and data is visible
        const { rows: verifyRows } = await db.query(
            `SELECT user_id FROM user_personal_info WHERE user_id = $1`,
            [userId]
        );

        if (verifyRows.length === 0) {
            return serverError(res, 'Failed to confirm personal information was saved');
        }

        const userIdHash = hashUserId(userId);
        
                // Calculate and store sun sign immediately (only needs birth date)
        try {
            const sunSign = calculateSunSignFromDate(parsedBirthDate);
            if (sunSign) {
                const minimalAstrologyData = {
                    sun_sign: sunSign,
                    sun_degree: 0,
                    moon_sign: null,
                    moon_degree: null,
                    rising_sign: null,
                    rising_degree: null,
                    calculated_at: new Date().toISOString()
                };
                
                                // Save minimal astrology data
                await db.query(
                    `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (user_id_hash) DO UPDATE SET
                     zodiac_sign = EXCLUDED.zodiac_sign,
                     astrology_data = EXCLUDED.astrology_data,
                     updated_at = CURRENT_TIMESTAMP`,
                    [userIdHash, sunSign, JSON.stringify(minimalAstrologyData)]
                );

                // VERIFY: Confirm minimal astrology data was saved
                const { rows: verifyAstrologyRows } = await db.query(
                    `SELECT astrology_data FROM user_astrology WHERE user_id_hash = $1`,
                    [userIdHash]
                );

                if (verifyAstrologyRows.length === 0) {
                    // Non-fatal: continue anyway, worker will retry if needed
                }
            }
        } catch (err) {
        }
        
        // Clear old astrology messages
        try {
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id_hash = $1 
                 AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
                [userIdHash]
            );
        } catch (err) {
        }
        
                        // Enqueue worker to calculate full birth chart (with moon/rising signs)
        // Data is verified saved above, so safe to proceed
        if (safeTime && safeCountry && safeProvince && safeCity && parsedBirthDate) {
            try {
                                // Delay to ensure write is fully propagated and database transaction committed
                // 1 second is needed for reliable read-after-write consistency
                const delayMs = 1000;
                await new Promise(resolve => setTimeout(resolve, delayMs));
                
                await enqueueMessage({
                    userId,
                    message: '[SYSTEM] Calculate my birth chart with rising sign and moon sign.'
                });
            } catch (err) {
            }
        }

                // If full astrology data provided (from sync-calculate or manual input)
        if (zodiacSign && astrologyData) {
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

            // VERIFY: Confirm full astrology data was saved
            const { rows: verifyFullAstrologyRows } = await db.query(
                `SELECT zodiac_sign FROM user_astrology WHERE user_id_hash = $1`,
                [userIdHash]
            );

            if (verifyFullAstrologyRows.length === 0) {
                return serverError(res, 'Failed to confirm astrology data was saved');
            }
        }

        res.json({ success: true, message: "Personal information saved successfully" });
        } catch (err) {
        return serverError(res, 'Failed to save personal information');
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
        return serverError(res, 'Failed to clear astrology cache');
    }
});

// Get user preferences
router.get("/:userId/preferences", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const userIdHash = hashUserId(userId);
    
    try {
        const { rows } = await db.query(
            `SELECT language, response_type, voice_enabled, COALESCE(voice_selected, 'sophia') as voice_selected, timezone, COALESCE(oracle_language, 'en-US') as oracle_language FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        
        if (rows.length === 0) {
            return res.json({
                language: 'en-US',
                response_type: 'full',
                voice_enabled: true,
                voice_selected: 'sophia',
                timezone: null,
                oracle_language: 'en-US'
            });
        }
        
        res.json(rows[0]);
        } catch (err) {
        return serverError(res, 'Failed to fetch preferences');
    }
});

// Save user preferences
// 🌍 CRITICAL: Allow timezone-only updates (for browser timezone detection on login)
// 🌎 NEW: oracle_language allows regional variants (en-GB, es-MX, es-DO, fr-CA, etc.)
router.post("/:userId/preferences", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { language, response_type, voice_enabled, voice_selected, timezone, oracle_language } = req.body;
    const userIdHash = hashUserId(userId);
    
    try {
        // 🌍 CRITICAL: If only timezone is provided, just update that field
        if (timezone && !language && !response_type && !oracle_language) {
                await db.query(
                `INSERT INTO user_preferences (user_id_hash, timezone)
                 VALUES ($1, $2)
                 ON CONFLICT (user_id_hash) DO UPDATE SET
                 timezone = EXCLUDED.timezone,
                 updated_at = CURRENT_TIMESTAMP`,
                [userIdHash, timezone]
            );
            return res.json({ success: true, message: 'Timezone saved successfully', timezone });
        }
        
        // 🌎 NEW: If timezone + language + oracle_language provided (temp user flow), update all three
        if (timezone && language && oracle_language && response_type) {
            
            // Validate language
            if (!['en-US', 'en-GB', 'es-ES', 'es-MX', 'es-DO', 'fr-FR', 'fr-CA', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'].includes(language)) {
                return validationError(res, 'Invalid language: ' + language);
            }
            
            // Validate response_type
            if (!['full', 'brief'].includes(response_type)) {
                return validationError(res, 'Invalid response_type: ' + response_type);
            }
            
            const validOracleLanguages = ['en-US', 'en-GB', 'es-ES', 'es-MX', 'es-DO', 'fr-FR', 'fr-CA'];
            if (!validOracleLanguages.includes(oracle_language)) {
                return validationError(res, 'Invalid oracle_language: ' + oracle_language);
            }
            
            const { rows } = await db.query(
                `INSERT INTO user_preferences (user_id_hash, language, response_type, voice_enabled, timezone, oracle_language)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (user_id_hash) DO UPDATE SET
                 language = EXCLUDED.language,
                 response_type = EXCLUDED.response_type,
                 voice_enabled = EXCLUDED.voice_enabled,
                 timezone = EXCLUDED.timezone,
                 oracle_language = EXCLUDED.oracle_language,
                 updated_at = CURRENT_TIMESTAMP
                 RETURNING language, response_type, voice_enabled, timezone, oracle_language`,
                [userIdHash, language, response_type, voice_enabled !== false, timezone, oracle_language]
            );
            
            return res.json({ success: true, preferences: rows[0] });
        }
        
        // Otherwise require language and response_type for full preference update
        if (!language || !response_type) {
            return validationError(res, 'Missing required fields: language, response_type');
        }
        
        if (!['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'].includes(language)) {
            return validationError(res, 'Invalid language');
        }
        
        if (!['full', 'brief'].includes(response_type)) {
            return validationError(res, 'Invalid response_type');
        }

        // Validate oracle_language if provided
        const validOracleLanguages = ['en-US', 'en-GB', 'es-ES', 'es-MX', 'es-DO', 'fr-FR', 'fr-CA'];
        const selectedOracleLanguage = (oracle_language && validOracleLanguages.includes(oracle_language)) ? oracle_language : language;

        const validVoices = ['sophia', 'cassandra', 'meridian', 'leo'];
        const selectedVoice = validVoices.includes(voice_selected) ? voice_selected : 'sophia';
        
        const { rows } = await db.query(
            `INSERT INTO user_preferences (user_id_hash, language, response_type, voice_enabled, voice_selected, timezone, oracle_language)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id_hash) DO UPDATE SET
             language = EXCLUDED.language,
             response_type = EXCLUDED.response_type,
             voice_enabled = EXCLUDED.voice_enabled,
             voice_selected = EXCLUDED.voice_selected,
             timezone = EXCLUDED.timezone,
             oracle_language = EXCLUDED.oracle_language,
             updated_at = CURRENT_TIMESTAMP
             RETURNING language, response_type, voice_enabled, voice_selected, timezone, oracle_language`,
            [userIdHash, language, response_type, voice_enabled !== false, selectedVoice, timezone, selectedOracleLanguage]
        );
        
        res.json({ success: true, preferences: rows[0] });
        } catch (err) {
        return serverError(res, 'Failed to save preferences');
    }
});

export default router;
