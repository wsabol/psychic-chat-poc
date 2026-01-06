import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { getUserTimezone, getLocalDateForTimezone, needsRegeneration } from "../shared/timezoneHelper.js";


const router = Router();

/**
 * GET /moon-phase/:userId
 * Fetch the cached moon phase commentary for today
 * 🌙 CRITICAL: Uses user's LOCAL timezone to determine "today", NOT GMT
 * Returns appropriate language version based on user preference
 * CRITICAL: Filters by moon_phase column directly in SQL query
 */
router.get("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.query; // Current moon phase name
    
    try {
        if (!phase) {
            return res.status(400).json({ error: 'Moon phase name required as query parameter' });
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
        
        // 🌙 CRITICAL: Get today's date in user's LOCAL timezone, not GMT
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        console.log(`[MOON-PHASE-API] Today (user local): ${todayLocalDate}`);
        
        // 🌙 CRITICAL FIX: Filter by moon_phase COLUMN directly - not just role
        const query = `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                pgp_sym_decrypt(content_full_lang_encrypted, $2)::text as content_lang,
                pgp_sym_decrypt(content_brief_lang_encrypted, $2)::text as content_brief_lang,
                language_code,
                created_at_local_date,
                moon_phase
            FROM messages 
            WHERE user_id_hash = $1 AND role = 'moon_phase' AND moon_phase = $3
            ORDER BY created_at DESC LIMIT 10`;
        const { rows } = await db.query(query, [userIdHash, process.env.ENCRYPTION_KEY, phase]);
        
        console.log(`[MOON-PHASE-API] Found ${rows.length} row(s) for phase="${phase}"`);
        
        // Find one from today matching this phase based on USER'S LOCAL timezone
        let validCommentary = null;
        let briefCommentary = null;
        let staleEntriesExist = false;
        
        for (const row of rows) {
            // Try to use language version if available and matches user preference
            let content = row.content_full;
            let brief = row.content_brief;
            
            if (row.language_code === userLanguage && row.content_lang) {
                content = row.content_lang;
                brief = row.content_brief_lang || row.content_brief;
            }
            
            if (!content) {
                console.warn(`[MOON-PHASE-API] Row has no content (lang: ${row.language_code}, userLang: ${userLanguage})`);
                continue;
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
                console.warn('[MOON-PHASE-API] Failed to parse commentary:', e.message);
                continue;
            }
            
            if (!commentary || !commentary.generated_at) {
                console.warn('[MOON-PHASE-API] Commentary missing required fields');
                continue;
            }
            
            // 🌙 CRITICAL: Check staleness using created_at_local_date and USER'S timezone
            if (row.created_at_local_date) {
                const isStale = needsRegeneration(row.created_at_local_date, todayLocalDate);
                console.log(`[MOON-PHASE-API] Phase="${phase}", db_moon_phase="${row.moon_phase}", created=${row.created_at_local_date}, today=${todayLocalDate}, stale=${isStale}`);
                
                if (!isStale) {
                    // Found a fresh commentary for this phase!
                    validCommentary = commentary;
                    briefCommentary = briefContent;
                    console.log(`[MOON-PHASE-API] ✓ Found fresh ${phase} moon phase for today`);
                    break;
                } else {
                    console.log(`[MOON-PHASE-API] Moon phase exists but is stale (${row.created_at_local_date} vs ${todayLocalDate})`);
                }
            } else {
                // Legacy entry without created_at_local_date, mark as stale
                console.log(`[MOON-PHASE-API] Found ${phase} moon phase but without created_at_local_date (legacy)`);
                staleEntriesExist = true;
            }
        }
        
        // Clean up stale entries
        if (staleEntriesExist) {
            console.log('[MOON-PHASE-API] Cleaning up stale entries without created_at_local_date');
            await db.query(
                `DELETE FROM messages 
                 WHERE user_id_hash = $1 
                 AND role = 'moon_phase'
                 AND created_at_local_date IS NULL`,
                [userIdHash]
            );
        }
        
        if (!validCommentary) {
            console.log(`[MOON-PHASE-API] No fresh moon phase commentary found for phase="${phase}"`);
            // Queue generation in background
            enqueueMessage({
                userId,
                message: `[SYSTEM] Generate moon phase commentary for ${phase}`
            }).catch(err => console.error('[MOON-PHASE-API] Error queueing generation:', err));
            
            return res.status(404).json({ error: 'No moon phase commentary found. Generating now...' });
        }
        
        console.log(`[MOON-PHASE-API] ✓ Returning fresh moon phase commentary for ${phase}`);
        
        res.json({ 
            commentary: validCommentary.text, 
            brief: briefCommentary?.text || null,
            generated_at: validCommentary.generated_at 
        });
        
    } catch (err) {
        console.error('[MOON-PHASE-API] Error fetching commentary:', err);
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
        console.error('[MOON-PHASE-API] Error queueing commentary:', err);
        res.status(500).json({ error: 'Failed to queue moon phase commentary generation' });
    }
});

export default router;
