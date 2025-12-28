import { Router } from "express";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { validateAge } from "../shared/ageValidator.js";
import { handleAgeViolation } from "../shared/violationHandler.js";
import { encrypt } from "../utils/encryption.js";
import { savePreferences } from "./preferences-fix.js";

const router = Router();

function parseDateForStorage(dateString) {
    if (!dateString) return null;
    try {
        const months = { 
            'jan': '01', 'january': '01',
            'feb': '02', 'february': '02',
            'mar': '03', 'march': '03',
            'apr': '04', 'april': '04',
            'may': '05',
            'jun': '06', 'june': '06',
            'jul': '07', 'july': '07',
            'aug': '08', 'august': '08',
            'sep': '09', 'sept': '09', 'september': '09',
            'oct': '10', 'october': '10',
            'nov': '11', 'november': '11',
            'dec': '12', 'december': '12'
        };
        
        const normalized = dateString.trim();
        let day, monthStr, year;
        const separators = ['-', ' ', '/'];
        
        for (const sep of separators) {
            if (normalized.includes(sep)) {
                const parts = normalized.split(sep).filter(p => p.trim().length > 0);
                if (parts.length === 3) {
                    day = parts[0].trim();
                    monthStr = parts[1].trim().toLowerCase();
                    year = parts[2].trim();
                    break;
                }
            }
        }
        
        if (!day || !monthStr || !year) {
            console.error('[DATE] Could not parse:', dateString);
            return null;
        }
        
        const month = months[monthStr];
        if (!month) {
            console.error('[DATE] Unknown month:', monthStr);
            return null;
        }
        
        const dayNum = parseInt(day, 10);
        const yearNum = parseInt(year, 10);
        
        if (isNaN(dayNum) || isNaN(yearNum)) {
            console.error('[DATE] NaN parsing day/year');
            return null;
        }
        
        if (dayNum < 1 || dayNum > 31) {
            console.error('[DATE] Day out of range:', dayNum);
            return null;
        }
        
        if (yearNum < 1800 || yearNum > 2100) {
            console.error('[DATE] Year out of range:', yearNum);
            return null;
        }
        
        const paddedDay = dayNum.toString().padStart(2, '0');
        const result = `${yearNum}-${month}-${paddedDay}`;
        console.log('[DATE] Parsed successfully:', dateString, '→', result);
        return result;
    } catch (e) {
        console.error('[DATE] Exception:', e.message);
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
            return res.status(400).json({ error: 'Invalid birth date format. Accepted formats: dd-mmm-yyyy, dd mmm yyyy, dd/mmm/yyyy (e.g., 01 Sep 1976 or 01-sep-1976)' });
        }

        // ✅ ENFORCE: Validate birth date format and age
        const ageValidation = validateAge(parsedBirthDate);
        if (!ageValidation.isValid) {
            return res.status(400).json({ error: ageValidation.error });
        }

        // ✅ ENFORCE: Check if user is 18+ (CRITICAL RULE)
        if (!ageValidation.isAdult) {
            
            // Handle the age violation
            const violationResult = await handleAgeViolation(userId, ageValidation.age);

            if (violationResult.deleted) {
                // Account has been deleted
                return res.status(403).json({
                    error: 'Account has been terminated due to policy violation.',
                    reason: 'Users must be 18 years or older',
                    deleted: true
                });
            } else {
                // First violation warning
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

        // Save personal info with encryption
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

        // Clear cached horoscopes and astrology insights since birth data changed
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
    try {
                        const { rows } = await db.query(
                        `SELECT language, response_type, voice_enabled FROM user_preferences WHERE user_id_hash = $1`,
            [hashUserId(userId)]
        );
        
        if (rows.length === 0) {
            // Return defaults if no preferences exist yet
            return res.json({
                language: 'en-US',
                response_type: 'full',
                voice_enabled: true
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
    const { language, response_type, voice_enabled } = req.body;
    
    try {
        // Validate input
        if (!language || !response_type) {
            return res.status(400).json({ error: 'Missing required fields: language, response_type' });
        }
        
        if (!['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'].includes(language)) {
            return res.status(400).json({ error: 'Invalid language' });
        }
        
        if (!['full', 'brief'].includes(response_type)) {
            return res.status(400).json({ error: 'Invalid response_type' });
        }
        
                        // Use savePreferences helper that properly checks before insert/update
        
        const prefs = await savePreferences(userId, language, response_type, voice_enabled, db, db);
        res.json({ success: true, preferences: prefs });
    } catch (err) {
        console.error('Error saving preferences:', err);
        res.status(500).json({ error: 'Failed to save preferences', details: err.message });
    }
});

export default router;
