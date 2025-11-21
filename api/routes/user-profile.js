import { Router } from "express";
import { db } from "../shared/db.js";
import { authorizeUser } from "../middleware/auth.js";

const router = Router();

// Helper function to parse date - handles both ISO format (YYYY-MM-DD) and dd-mmm-yyyy
function parseDateForStorage(dateString) {
    if (!dateString) return null;
    try {
        // If already in YYYY-MM-DD format (ISO), just return it
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
            return dateString.trim();
        }
        
        // Otherwise parse dd-mmm-yyyy format
        const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
        const parts = dateString.trim().split('-');
        if (parts.length !== 3) return dateString;
        
        const day = parts[0].trim().padStart(2, '0');
        const monthStr = parts[1].trim();
        const month = months[monthStr];
        const year = parts[2].trim();
        
        if (!month) {
            console.error(`Invalid month: ${monthStr}`);
            return dateString;
        }
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('Date parsing error:', e, dateString);
        return dateString;
    }
}

// Get user personal information (with decryption)
router.get("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';
    try {
                const { rows } = await db.query(`
            SELECT 
                CASE WHEN first_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(first_name_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as first_name,
                CASE WHEN last_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(last_name_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as last_name,
                CASE WHEN email_encrypted IS NOT NULL THEN pgp_sym_decrypt(email_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as email,
                CASE WHEN birth_date_encrypted IS NOT NULL THEN SUBSTRING(pgp_sym_decrypt(birth_date_encrypted, '${ENCRYPTION_KEY}'), 1, 10) ELSE NULL END as birth_date,
                birth_time,
                CASE WHEN birth_country_encrypted IS NOT NULL THEN pgp_sym_decrypt(birth_country_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as birth_country,
                CASE WHEN birth_province_encrypted IS NOT NULL THEN pgp_sym_decrypt(birth_province_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as birth_province,
                CASE WHEN birth_city_encrypted IS NOT NULL THEN pgp_sym_decrypt(birth_city_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as birth_city,
                CASE WHEN birth_timezone_encrypted IS NOT NULL THEN pgp_sym_decrypt(birth_timezone_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as birth_timezone,
                sex,
                address_preference 
            FROM user_personal_info 
            WHERE user_id = $1
        `, [userId]);
        if (rows.length === 0) {
            return res.json({});
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching personal info:', err);
        res.status(500).json({ error: 'Failed to fetch personal information', details: err.message });
    }
});

// Save or update user personal information (with encryption)
router.post("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { firstName, lastName, email, birthDate, birthTime, birthCountry, birthProvince, birthCity, birthTimezone, sex, addressPreference, zodiacSign, astrologyData } = req.body;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

    try {
        // Validate required fields
                if (!firstName || !lastName || !email || !birthDate || !sex) {
            return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email, birthDate, sex' });
        }

        // Parse the date from dd-mmm-yyyy to YYYY-MM-DD format for storage
        const parsedBirthDate = parseDateForStorage(birthDate);
        
        if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
            return res.status(400).json({ error: 'Invalid birth date format' });
        }

        // Use UPSERT with pgp_sym_encrypt for *_encrypted columns
        // Store encrypted data in the _encrypted columns (BYTEA)
        await db.query(`
            INSERT INTO user_personal_info 
             (user_id, first_name_encrypted, last_name_encrypted, email_encrypted, birth_date_encrypted, birth_time, birth_country_encrypted, birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted, sex, address_preference)
             VALUES (
                $1,
                pgp_sym_encrypt($2, '${ENCRYPTION_KEY}'),
                pgp_sym_encrypt($3, '${ENCRYPTION_KEY}'),
                pgp_sym_encrypt($4, '${ENCRYPTION_KEY}'),
                pgp_sym_encrypt($5, '${ENCRYPTION_KEY}'),
                $6,
                pgp_sym_encrypt($7, '${ENCRYPTION_KEY}'),
                pgp_sym_encrypt($8, '${ENCRYPTION_KEY}'),
                pgp_sym_encrypt($9, '${ENCRYPTION_KEY}'),
                pgp_sym_encrypt($10, '${ENCRYPTION_KEY}'),
                $11,
                $12
             )
             ON CONFLICT (user_id) DO UPDATE SET
             first_name_encrypted = pgp_sym_encrypt($2, '${ENCRYPTION_KEY}'),
             last_name_encrypted = pgp_sym_encrypt($3, '${ENCRYPTION_KEY}'),
             email_encrypted = pgp_sym_encrypt($4, '${ENCRYPTION_KEY}'),
             birth_date_encrypted = pgp_sym_encrypt($5, '${ENCRYPTION_KEY}'),
             birth_time = $6,
             birth_country_encrypted = pgp_sym_encrypt($7, '${ENCRYPTION_KEY}'),
             birth_province_encrypted = pgp_sym_encrypt($8, '${ENCRYPTION_KEY}'),
             birth_city_encrypted = pgp_sym_encrypt($9, '${ENCRYPTION_KEY}'),
             birth_timezone_encrypted = pgp_sym_encrypt($10, '${ENCRYPTION_KEY}'),
             sex = $11,
             address_preference = $12,
             updated_at = CURRENT_TIMESTAMP
        `,
            [userId, firstName, lastName, email, parsedBirthDate, birthTime, birthCountry, birthProvince, birthCity, birthTimezone, sex, addressPreference]
                );

        // Handle astrology data if provided
        if (zodiacSign && astrologyData) {
            
            // Use UPSERT for astrology data as well
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
