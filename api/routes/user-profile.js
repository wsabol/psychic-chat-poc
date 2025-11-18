import { Router } from "express";
import { db } from "../shared/db.js";

const router = Router();

// Helper function to parse date from dd-mmm-yyyy to YYYY-MM-DD
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
            console.error(`Invalid month: ${monthStr}`);
            return dateString;
        }
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('Date parsing error:', e, dateString);
        return dateString;
    }
}

// Get user personal information
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const { rows } = await db.query(
            "SELECT first_name, last_name, email, to_char(birth_date, 'YYYY-MM-DD') AS birth_date, birth_time, birth_city, birth_state, sex, address_preference FROM user_personal_info WHERE user_id = $1",
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

// Save or update user personal information
router.post("/:userId", async (req, res) => {
    const { userId } = req.params;
    const { firstName, lastName, email, birthDate, birthTime, birthCity, birthState, sex, addressPreference, zodiacSign, astrologyData } = req.body;

    try {
        // Validate required fields
        if (!firstName || !lastName || !email || !birthDate || !sex) {
            console.log(`[API] Validation failed for user ${userId}: Missing required fields`);
            return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email, birthDate, sex' });
        }

        // Parse the date from dd-mmm-yyyy to YYYY-MM-DD format for storage
        const parsedBirthDate = parseDateForStorage(birthDate);
        
        if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
            console.log(`[API] Invalid date format for user ${userId}: ${birthDate}`);
            return res.status(400).json({ error: 'Invalid birth date format' });
        }

        console.log(`[API] Saving personal info for user ${userId}:`, { firstName, lastName, email, birthDate: parsedBirthDate, birthTime, birthCity, birthState, sex });

        // Use UPSERT (INSERT ... ON CONFLICT ... DO UPDATE) to handle both insert and update cases
        await db.query(
            `INSERT INTO user_personal_info 
             (user_id, first_name, last_name, email, birth_date, birth_time, birth_city, birth_state, sex, address_preference)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (user_id) DO UPDATE SET
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             email = EXCLUDED.email,
             birth_date = EXCLUDED.birth_date,
             birth_time = EXCLUDED.birth_time,
             birth_city = EXCLUDED.birth_city,
             birth_state = EXCLUDED.birth_state,
             sex = EXCLUDED.sex,
             address_preference = EXCLUDED.address_preference,
             updated_at = CURRENT_TIMESTAMP`,
            [userId, firstName, lastName, email, parsedBirthDate, birthTime, birthCity, birthState, sex, addressPreference]
        );

        console.log(`[API] Personal info saved successfully for user ${userId}`);

        // Handle astrology data if provided
        if (zodiacSign && astrologyData) {
            console.log(`[API] Saving astrology data for user ${userId}:`, { zodiacSign });
            
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
            
            console.log(`[API] Astrology data saved successfully for user ${userId}`);
        }

        res.json({ success: true, message: "Personal information saved successfully" });
    } catch (err) {
        console.error('Error saving personal info:', err);
        res.status(500).json({ error: 'Failed to save personal information', details: err.message });
    }
});


export default router;
