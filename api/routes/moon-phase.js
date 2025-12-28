import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";


const router = Router();

/**
 * GET /moon-phase/:userId
 * Fetch the cached moon phase commentary for today
 * Returns appropriate language version based on user preference
 */
router.get("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.query; // Current moon phase name
    
    try {
        if (!phase) {
            return res.status(400).json({ error: 'Moon phase name required as query parameter' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const userIdHash = hashUserId(userId);
        
        // Fetch user's language preference
        const { rows: prefRows } = await db.query(
            `SELECT language FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        
        // Fetch messages with language versions
        const query = `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                pgp_sym_decrypt(content_full_lang_encrypted, $2)::text as content_lang,
                pgp_sym_decrypt(content_brief_lang_encrypted, $2)::text as content_brief_lang,
                language_code,
                created_at 
            FROM messages 
            WHERE user_id_hash = $1 AND role = 'moon_phase' 
            ORDER BY created_at DESC LIMIT 10`;
        const { rows } = await db.query(query, [userIdHash, process.env.ENCRYPTION_KEY]);
        
        // Find one from today matching this phase that's less than 24 hours old
        let validCommentary = null;
        let briefCommentary = null;
        let staleEntriesExist = false;
        let needsRefresh = false;
        
        for (const row of rows) {
            // Try to use language version if available and matches user preference
            let content = row.content_full;
            let brief = row.content_brief;
            
            if (row.language_code === userLanguage && row.content_lang) {
                content = row.content_lang;
                brief = row.content_brief_lang || row.content_brief;
            }
            
            if (!content) continue;
            
            let commentary, briefContent;
            try {
                commentary = typeof content === 'string' 
                    ? JSON.parse(content) 
                    : content;
                if (brief) {
                    briefContent = typeof brief === 'string'
                        ? JSON.parse(brief)
                        : brief;
                }
            } catch (e) {
                console.warn('[MOON-PHASE] Failed to parse commentary:', e.message);
                continue;
            }
            
            if (!commentary || !commentary.generated_at) continue;
            
            const generatedDate = commentary.generated_at.split('T')[0];
            const generatedTime = new Date(commentary.generated_at);
            
            if (generatedDate === today && commentary.phase === phase) {
                // Check if commentary is older than 24 hours
                if (generatedTime < twentyFourHoursAgo) {
                    needsRefresh = true;
                } else {
                    validCommentary = commentary;
                    briefCommentary = briefContent;
                    break;
                }
            }
            
            if (generatedDate !== today) {
                staleEntriesExist = true;
            }
        }
        
        // Clean up stale entries
        if (staleEntriesExist) {
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id_hash = $1 
                 AND role = 'moon_phase'
                 AND created_at < CURRENT_DATE`,
                [userIdHash]
            );
        }
        
        if (!validCommentary) {
            if (needsRefresh) {
                // Queue refresh in background (don't wait for it)
                enqueueMessage({
                    userId,
                    message: `[SYSTEM] Generate moon phase commentary for ${phase}`
                }).catch(err => console.error('[MOON-PHASE API] Error queueing refresh:', err));
            }
            return res.status(404).json({ error: 'No moon phase commentary found. Generating now...' });
        }
        
        res.json({ 
            commentary: validCommentary.text, 
            brief: briefCommentary?.text || null,
            generated_at: validCommentary.generated_at 
        });
        
    } catch (err) {
        console.error('[MOON-PHASE API] Error fetching commentary:', err);
        res.status(500).json({ error: 'Failed to fetch moon phase commentary' });
    }
});

/**
 * POST /moon-phase/:userId
 * Generate new moon phase commentary
 */
router.post("/:userId", authenticateToken, authorizeUser, async (req, res) => {
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
