import { Router } from "express";
import { enqueueMessage } from "../shared/queue.js";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";

const router = Router();

/**
 * GET /moon-phase/:userId
 * Fetch the cached moon phase commentary for today
 */
router.get("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.query; // Current moon phase name
    
    try {
        if (!phase) {
            return res.status(400).json({ error: 'Moon phase name required as query parameter' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's moon phase commentary
        const { rows } = await db.query(
            `SELECT content FROM messages 
             WHERE user_id = $1 
             AND role = 'moon_phase'
             ORDER BY created_at DESC 
             LIMIT 10`,
            [userId]
        );
        
        // Find one from today matching this phase
        let validCommentary = null;
        let staleEntriesExist = false;
        
        for (const row of rows) {
            const commentary = typeof row.content === 'string' 
                ? JSON.parse(row.content) 
                : row.content;
            
            const generatedDate = commentary.generated_at?.split('T')[0];
            
            if (generatedDate === today && commentary.phase === phase) {
                validCommentary = commentary;
                break;
            }
            
            if (generatedDate !== today) {
                staleEntriesExist = true;
            }
        }
        
        // Clean up stale entries
        if (staleEntriesExist) {
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id = $1 
                 AND role = 'moon_phase'
                 AND created_at < CURRENT_DATE`,
                [userId]
            );
        }
        
        if (!validCommentary) {
            return res.status(404).json({ error: 'No moon phase commentary found. Generating now...' });
        }
        
        res.json({ commentary: validCommentary.text, generated_at: validCommentary.generated_at });
        
    } catch (err) {
        console.error('[MOON-PHASE API] Error fetching commentary:', err);
        res.status(500).json({ error: 'Failed to fetch moon phase commentary' });
    }
});

/**
 * POST /moon-phase/:userId
 * Generate new moon phase commentary
 */
router.post("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.body;
    
    try {
        if (!phase) {
            return res.status(400).json({ error: 'Moon phase name required in request body' });
        }
        
        // Enqueue moon phase commentary generation
        await enqueueMessage({
            userId,
            message: `[SYSTEM] Generate moon phase commentary for ${phase}`
        });
        
        res.json({ 
            status: 'Moon phase commentary generation queued',
            message: 'Your personalized moon phase insight is being generated. Please wait a moment.',
            phase: phase
        });
        
    } catch (err) {
        console.error('[MOON-PHASE API] Error queueing commentary:', err);
        res.status(500).json({ error: 'Failed to queue moon phase commentary generation' });
    }
});

export default router;
