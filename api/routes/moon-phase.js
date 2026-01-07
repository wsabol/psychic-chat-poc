import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { getLocalDateForTimezone } from "../shared/timezoneHelper.js";

const router = Router();

router.get("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.query;
    
    try {
        if (!phase) {
            return res.status(400).json({ error: 'Moon phase name required' });
        }
        
        const userIdHash = hashUserId(userId);
        
        // Fetch user's language preference AND timezone
        const { rows: prefRows } = await db.query(
            `SELECT language, timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const userTimezone = prefRows.length > 0 ? prefRows[0].timezone : 'UTC';
        console.log(`[MOON-PHASE-API] User language: ${userLanguage}, timezone: ${userTimezone}`);
        
        // Get TODAY's date in user's LOCAL timezone
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        console.log(`[MOON-PHASE-API] Today (user local): ${todayLocalDate}`);
        console.log(`[MOON-PHASE-API] DEBUG - userIdHash: ${userIdHash}, phase: ${phase}, todayLocalDate: ${todayLocalDate}`);
        
        // Fetch moon phase
        // NOTE: Only content_full_encrypted and content_brief_encrypted exist in database
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                language_code,
                moon_phase,
                created_at_local_date
            FROM messages 
            WHERE user_id_hash = $1 
              AND role = 'moon_phase' 
              AND moon_phase = $3
              AND created_at_local_date = $4
            ORDER BY created_at DESC
            LIMIT 1`,
            [userIdHash, process.env.ENCRYPTION_KEY, phase, todayLocalDate]
        );
        
        console.log(`[MOON-PHASE-API] Found ${rows.length} moon phase record(s)`);
        
        if (rows.length === 0) {
            console.log(`[MOON-PHASE-API] No ${phase} moon phase found for ${todayLocalDate}`);
            enqueueMessage({
                userId,
                message: `[SYSTEM] Generate moon phase commentary for ${phase}`
            }).catch(err => console.error('[MOON-PHASE-API] Error queueing:', err));
            
            return res.status(404).json({ error: 'No moon phase commentary found. Generating now...' });
        }
        
        // Process the moon phase row
        const row = rows[0];
        let content = row.content_full;
        let brief = row.content_brief;
        
        if (!content) {
            console.warn(`[MOON-PHASE-API] No content found in moon phase row`);
            return res.status(404).json({ error: `Moon phase data is empty` });
        }
        
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
            console.error(`[MOON-PHASE-API] Failed to parse:`, e.message);
            return res.status(500).json({ error: `Failed to parse moon phase data` });
        }
        
        if (!commentary || !commentary.generated_at) {
            console.warn(`[MOON-PHASE-API] Moon phase missing generated_at`);
            return res.status(404).json({ error: `Moon phase data is incomplete` });
        }
        
        console.log(`[MOON-PHASE-API] ✓ Returning ${phase} moon phase for ${todayLocalDate}`);
        
        res.json({ 
            commentary: commentary.text, 
            brief: briefContent?.text || null,
            generated_at: commentary.generated_at 
        });
        
    } catch (err) {
        console.error('[MOON-PHASE-API] Error:', err);
        res.status(500).json({ error: 'Failed to fetch moon phase commentary' });
    }
});

router.post("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.body;
    
    try {
        if (!phase) {
            return res.status(400).json({ error: 'Moon phase name required in request body' });
        }
        
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
        console.error('[MOON-PHASE-API] Error queueing commentary:', err);
        res.status(500).json({ error: 'Failed to queue moon phase commentary generation' });
    }
});

export default router;
