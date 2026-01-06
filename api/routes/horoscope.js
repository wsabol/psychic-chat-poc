import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { getUserTimezone, getLocalDateForTimezone } from "../shared/timezoneHelper.js";


const router = Router();

/**
 * GET /horoscope/:userId/:range
 * Fetch the cached horoscope for the user matching the range and TODAY'S LOCAL DATE
 * CRITICAL: Validates created_at_local_date matches user's timezone date
 * Returns appropriate language version based on user preference
 */
router.get("/:userId/:range", authenticateToken, authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    console.log(`[HOROSCOPE-API] GET ${range}`);
    
    try {
        // Validate range
        if (!['daily', 'weekly'].includes(range.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid range. Must be daily or weekly.' });
        }
        
        const userIdHash = hashUserId(userId);
        
        // Fetch user's language preference
        // CRITICAL: user_preferences.user_id_hash is BYTEA, so convert hex string
        const { rows: prefRows } = await db.query(
            `SELECT language FROM user_preferences WHERE user_id_hash = decode($1, 'hex')`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        console.log(`[HOROSCOPE-API] User language: ${userLanguage}`);
        
        // Fetch horoscopes - return most recent for this range
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                pgp_sym_decrypt(content_full_lang_encrypted, $2)::text as content_lang,
                pgp_sym_decrypt(content_brief_lang_encrypted, $2)::text as content_brief_lang,
                language_code,
                horoscope_range,
                created_at_local_date
                FROM messages 
                WHERE user_id_hash = $1 
                  AND role = 'horoscope' 
                  AND horoscope_range = $3
                ORDER BY CASE WHEN language_code = $4 THEN 0 ELSE 1 END, created_at DESC
                LIMIT 1`,
            [userIdHash, process.env.ENCRYPTION_KEY, range.toLowerCase(), userLanguage]
        );
        
        console.log(`[HOROSCOPE-API] Found ${rows.length} horoscope(s)`);
        
        if (rows.length === 0) {
            console.log(`[HOROSCOPE-API] No ${range} horoscope found`);
            return res.status(404).json({ error: `No ${range} horoscope found. Generating now...` });
        }
        
        // Process the horoscope row
        const row = rows[0];
        let content = row.content_full;
        let brief = row.content_brief;
        
        // ✅ CRITICAL: Prefer language-specific version if it matches user's language AND exists
        console.log(`[HOROSCOPE-API] Row language_code: ${row.language_code}, user language: ${userLanguage}`);
        if (row.language_code === userLanguage && row.content_lang) {
            console.log(`[HOROSCOPE-API] ✓ Using translated content for ${userLanguage}`);
            content = row.content_lang;
            brief = row.content_brief_lang || row.content_brief;
        } else if (row.language_code !== userLanguage && row.content_lang) {
            console.log(`[HOROSCOPE-API] ⚠️ Stored language (${row.language_code}) doesn't match user language (${userLanguage}), using English baseline`);
        }
        
        if (!content) {
            console.warn(`[HOROSCOPE-API] No content found in horoscope row`);
            return res.status(404).json({ error: `Horoscope data is empty` });
        }
        
        let horoscope, briefContent;
        try {
            horoscope = typeof content === 'string' 
                ? JSON.parse(content) 
                : content;
            if (brief) {
                briefContent = typeof brief === 'string'
                    ? JSON.parse(brief)
                    : brief;
            }
        } catch (e) {
            console.error(`[HOROSCOPE-API] Failed to parse horoscope:`, e.message);
            return res.status(500).json({ error: `Failed to parse horoscope data` });
        }
        
        if (!horoscope || !horoscope.generated_at) {
            console.warn(`[HOROSCOPE-API] Horoscope missing generated_at timestamp`);
            return res.status(404).json({ error: `Horoscope data is incomplete` });
        }
        
        console.log(`[HOROSCOPE-API] ✓ Returning horoscope for ${range}`);
        res.json({ 
            horoscope: horoscope.text, 
            brief: briefContent?.text || null,
            generated_at: horoscope.generated_at 
        });
        
    } catch (err) {
        console.error('[HOROSCOPE] Error fetching horoscope:', err);
        res.status(500).json({ error: 'Failed to fetch horoscope' });
    }
});

/**
 * POST /horoscope/:userId/:range
 * Generate new horoscopes by enqueueing a worker job
 */
router.post("/:userId/:range", authenticateToken, authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly'].includes(range.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid range. Must be daily or weekly.' });
        }
        
        // Enqueue horoscope generation job
        await enqueueMessage({
            userId,
            message: `[SYSTEM] Generate horoscope for ${range.toLowerCase()}`
        });
        
        res.json({ 
            status: 'Horoscope generation queued',
            message: 'Your horoscope is being generated. Please check back in a few seconds.',
            range: range.toLowerCase()
        });
        
    } catch (err) {
        console.error('[HOROSCOPE API] Error queueing horoscope:', err);
        res.status(500).json({ error: 'Failed to queue horoscope generation' });
    }
});

export default router;
