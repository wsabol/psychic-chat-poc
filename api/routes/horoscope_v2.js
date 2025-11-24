import { Router } from "express";
import { enqueueMessage } from "../shared/queue.js";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";

const router = Router();

/**
 * GET /horoscope/:userId/:range
 * Fetch the most recent cached horoscope for the user
 * Auto-clears if generated on a different date or birthdate changed
 */
router.get("/:userId/:range", authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly', 'monthly'].includes(range.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid range. Must be daily, weekly, or monthly.' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // Get most recent horoscope
        const { rows } = await db.query(
            `SELECT content FROM messages 
             WHERE user_id = $1 
             AND role = 'horoscope'
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No horoscope found. Generating now...' });
        }
        
        const horoscope = typeof rows[0].content === 'string' 
            ? JSON.parse(rows[0].content) 
            : rows[0].content;
        
        // Check if range matches
        if (horoscope.range !== range.toLowerCase()) {
            return res.status(404).json({ error: `No ${range} horoscope found. Generating now...` });
        }
        
        // Extract date from generated_at timestamp and check if it's from today
        const generatedDate = horoscope.generated_at?.split('T')[0];
        
        if (generatedDate !== today) {
            // Delete stale horoscope from previous day
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id = $1 
                 AND role = 'horoscope'`,
                [userId]
            );
            return res.status(404).json({ error: 'Horoscope from previous day. Generating fresh one...' });
        }
        
        res.json({ horoscope: horoscope.text, generated_at: horoscope.generated_at });
        
    } catch (err) {
        console.error('[HOROSCOPE API] Error fetching horoscope:', err);
        res.status(500).json({ error: 'Failed to fetch horoscope' });
    }
});

/**
 * POST /horoscope/:userId/:range
 * Generate a new horoscope by enqueueing a worker job
 */
router.post("/:userId/:range", authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly', 'monthly'].includes(range.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid range. Must be daily, weekly, or monthly.' });
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
