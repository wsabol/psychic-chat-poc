import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";


const router = Router();

/**
 * GET /horoscope/:userId/:range
 * Fetch the cached horoscope for the user matching the range and today's date
 * Auto-clears if generated on a different date
 * Returns appropriate language version based on user preference
 */
router.get("/:userId/:range", authenticateToken, authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly'].includes(range.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid range. Must be daily or weekly.' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const userIdHash = hashUserId(userId);
        
        // Fetch user's language preference
        const { rows: prefRows } = await db.query(
            `SELECT language FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        
        // Fetch horoscopes with language versions
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                pgp_sym_decrypt(content_full_lang_encrypted, $2)::text as content_lang,
                pgp_sym_decrypt(content_brief_lang_encrypted, $2)::text as content_brief_lang,
                language_code,
                created_at 
                FROM messages 
                WHERE user_id_hash = $1 AND role = 'horoscope' 
                ORDER BY created_at DESC LIMIT 100`,
            [userIdHash, process.env.ENCRYPTION_KEY]
        );
        
        // Find the first horoscope that matches the range and is from today
        let validHoroscope = null;
        let briefHoroscope = null;
        let staleHoroscopesExist = false;
        
        for (const row of rows) {
            // Try to use language version if available and matches user preference
            let content = row.content_full;
            let brief = row.content_brief;
            
            if (row.language_code === userLanguage && row.content_lang) {
                content = row.content_lang;
                brief = row.content_brief_lang || row.content_brief;
            }
            
            if (!content) continue;
            
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
                console.warn('[HOROSCOPE] Failed to parse horoscope:', e.message);
                continue;
            }
            
            if (!horoscope || !horoscope.generated_at) continue;
            
            const generatedDate = horoscope.generated_at.split('T')[0];
            
            if (generatedDate === today && horoscope.range === range.toLowerCase()) {
                validHoroscope = horoscope;
                briefHoroscope = briefContent;
                break;
            }
            
            if (generatedDate !== today) {
                staleHoroscopesExist = true;
            }
        }
        
        // If we found stale horoscopes, clean them up
        if (staleHoroscopesExist) {
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id_hash = $1 
                 AND role = 'horoscope'
                 AND created_at < CURRENT_DATE`,
                [userIdHash]
            );
        }
        
        if (!validHoroscope) {
            return res.status(404).json({ error: `No ${range} horoscope found. Generating now...` });
        }
        
        res.json({ 
            horoscope: validHoroscope.text, 
            brief: briefHoroscope?.text || null,
            generated_at: validHoroscope.generated_at 
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
