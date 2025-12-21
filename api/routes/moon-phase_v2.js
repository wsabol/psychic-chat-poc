import { Router } from "express";
import { enqueueMessage } from "../shared/queue.js";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { hashUserId } from "../shared/hashUtils.js";

const router = Router();

/**
 * GET /moon-phase/:userId
 * Fetch the cached moon phase commentary for the current phase
 * Regenerates if moon phase has changed or if from previous day
 */
router.get("/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.query; // Current moon phase name
    
    try {
        if (!phase) {
            return res.status(400).json({ error: 'Moon phase name required as query parameter' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const userIdHash = hashUserId(userId);
        
        // Get recent moon phase commentaries - uses user_id_hash now
        const { rows } = await db.query(
            `SELECT content_encrypted FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'moon_phase'
             ORDER BY created_at DESC 
             LIMIT 10`,
            [userIdHash]
        );
        
        // Find one from today matching this specific phase
        let validCommentary = null;
        let staleEntriesExist = false;
        
        for (const row of rows) {
            // Content is now encrypted, just stored as text
            const commentary = typeof row.content_encrypted === 'string' 
                ? JSON.parse(row.content_encrypted) 
                : row.content_encrypted;
            
            const generatedDate = commentary.generated_at?.split('T')[0];
            const storedPhase = commentary.phase;
            
            // Valid if: from today AND phase matches current phase
            if (generatedDate === today && storedPhase === phase) {
                validCommentary = commentary;
                break;
            }
            
            // Mark stale if from different day OR different phase
            if (generatedDate !== today || storedPhase !== phase) {
                staleEntriesExist = true;
            }
        }
        
        // Clean up stale entries (different date or different phase on same day)
        if (staleEntriesExist) {
            // Delete entries from previous days
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id_hash = $1 
                 AND role = 'moon_phase'
                 AND created_at < CURRENT_DATE`,
                [userIdHash]
            );
            
            // Delete entries for different phases on same day
            // Note: We can't use JSON operators on encrypted data, so delete all stale entries
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id_hash = $1 
                 AND role = 'moon_phase'
                 AND created_at >= CURRENT_DATE
                 AND created_at < (
                   SELECT MAX(created_at) FROM messages 
                   WHERE user_id_hash = $1 AND role = 'moon_phase' AND created_at >= CURRENT_DATE
                 )`,
                [userIdHash]
            );
        }
        
        if (!validCommentary) {
            return res.status(404).json({ error: `No ${phase} moon phase commentary found. Generating now...` });
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
