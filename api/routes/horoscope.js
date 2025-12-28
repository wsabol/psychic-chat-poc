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
 * Handles both encrypted and plain text content
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
                // Fetch BOTH full and brief horoscopes
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                created_at 
                FROM messages 
                WHERE user_id_hash = $1 AND role = 'horoscope' 
                ORDER BY created_at DESC LIMIT 100`,
            [userIdHash, process.env.ENCRYPTION_KEY]
        );
        
        // Find the first horoscope that matches the range and is from today
        let validHoroscope = null;
        let staleHoroscopesExist = false;
        
                for (const row of rows) {
            if (!row.content_full) continue;
            
            let horoscope, briefContent;
            try {
                horoscope = typeof row.content_full === 'string' 
                    ? JSON.parse(row.content_full) 
                    : row.content_full;
                if (row.content_brief) {
                    briefContent = typeof row.content_brief === 'string'
                        ? JSON.parse(row.content_brief)
                        : row.content_brief;
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
 * 
 * IMPORTANT: This generates ONE horoscope per day per range.
 * The worker handler generates BOTH daily and weekly horoscopes at once.
 * This prevents duplicate generations and maintains consistency:
 * - Same horoscope shown in HoroscopePage
 * - Same horoscope shown in Chat when user asks
 * - No conflicting guidance within a 24-hour period
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
