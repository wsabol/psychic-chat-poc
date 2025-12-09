import { Router } from "express";
import { enqueueMessage } from "../shared/queue.js";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";

const router = Router();

/**
 * GET /horoscope/:userId/:range
 * Fetch the cached horoscope for the user matching the range and today's date
 * Auto-clears if generated on a different date
 */
router.get("/:userId/:range", authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly'].includes(range.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid range. Must be daily or weekly.' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // Get recent horoscopes (limited to last 100 to avoid huge queries)
        const { rows } = await db.query(
            `SELECT content, created_at FROM messages 
             WHERE user_id = $1 
             AND role = 'horoscope'
             ORDER BY created_at DESC 
             LIMIT 100`,
            [userId]
        );
        
        // Find the first horoscope that matches the range and is from today
        let validHoroscope = null;
        let staleHoroscopesExist = false;
        
        for (const row of rows) {
            const horoscope = typeof row.content === 'string' 
                ? JSON.parse(row.content) 
                : row.content;
            
            const generatedDate = horoscope.generated_at?.split('T')[0];
            
            // Check if this horoscope is from today and matches the requested range
            if (generatedDate === today && horoscope.range === range.toLowerCase()) {
                validHoroscope = horoscope;
                break;
            }
            
            // Mark that we have old horoscopes
            if (generatedDate !== today) {
                staleHoroscopesExist = true;
            }
        }
        
        // If we found stale horoscopes, clean them up
        if (staleHoroscopesExist) {
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id = $1 
                 AND role = 'horoscope'
                 AND created_at < CURRENT_DATE`,
                [userId]
            );
        }
        
        if (!validHoroscope) {
            return res.status(404).json({ error: `No ${range} horoscope found. Generating now...` });
        }
        
        res.json({ horoscope: validHoroscope.text, generated_at: validHoroscope.generated_at });
        
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
router.post("/:userId/:range", authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly'].includes(range.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid range. Must be daily or weekly.' });
        }
        
        // Enqueue horoscope generation job (generates all ranges)
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
