import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage, getClient } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { getLocalDateForTimezone } from "../shared/timezoneHelper.js";
import { validationError, serverError, notFoundError } from "../utils/responses.js";
import { successResponse } from '../utils/responses.js';

const router = Router();

/**
 * Check if generation is already in progress for this user/phase
 * Prevents infinite loop of duplicate queue jobs
 */
async function isGenerationInProgress(userId, phase) {
    try {
        const redis = await getClient();
        const key = `moon-phase:generating:${userId}:${phase}`;
        const exists = await redis.get(key);
        return !!exists;
    } catch (err) {
        return false; // If Redis fails, allow queuing
    }
}

/**
 * Mark generation as in progress for 3 minutes (180 seconds)
 * CRITICAL: Must be longer than actual generation time (~100 seconds) to prevent duplicate queue jobs
 */
async function markGenerationInProgress(userId, phase) {
    try {
        const redis = await getClient();
        const key = `moon-phase:generating:${userId}:${phase}`;
        await redis.setEx(key, 180, 'true'); // Expires in 3 minutes (covers ~100 second generation time)
    } catch (err) {
        // Ignore Redis errors
    }
}

router.get("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.query;
    
    try {
        if (!phase) {
            return validationError(res, 'Moon phase name required');
        }
        
        const userIdHash = hashUserId(userId);
        
        // Fetch user's language preference AND timezone
        const { rows: prefRows } = await db.query(
            `SELECT language, timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const userTimezone = prefRows.length > 0 ? prefRows[0].timezone : 'UTC';
        
        // Get TODAY's date in user's LOCAL timezone
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
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
        
        if (rows.length === 0) {
            // Only queue if not already generating (prevents infinite loop)
            const alreadyGenerating = await isGenerationInProgress(userId, phase);
            if (!alreadyGenerating) {
                await markGenerationInProgress(userId, phase);
                enqueueMessage({
                    userId,
                    message: `[SYSTEM] Generate moon phase commentary for ${phase}`
                }).catch(() => {});
            }
            
            return notFoundError(res, 'No moon phase commentary found. Generating now...');
        }
        
        // Process the moon phase row
        const row = rows[0];
        let content = row.content_full;
        let brief = row.content_brief;
        
                if (!content) {
            return notFoundError(res, `Moon phase data is empty` );
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
            return serverError(res, `Failed to parse moon phase data` );
        }
        
                if (!commentary || !commentary.generated_at) {
            return notFoundError(res, 'Moon phase data is incomplete');
        }
        
        successResponse(res, { 
            commentary: commentary.text, 
            brief: briefContent?.text || null,
            generated_at: commentary.generated_at 
        });
        
        } catch (err) {
        return serverError(res, 'Failed to fetch moon phase commentary');
    }
});

router.post("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.body;
    
    try {
        if (!phase) {
            return validationError(res, 'Moon phase name required in request body');
        }
        
        // Import synchronous processor
        const { processMoonPhaseSync } = await import('../services/chat/processor.js');
        
        // Generate moon phase commentary synchronously
        const result = await processMoonPhaseSync(userId, phase);
        
        successResponse(res, { 
            commentary: result.commentary,
            brief: result.brief,
            generated_at: result.generated_at,
            phase: result.phase
        });
        
    } catch (err) {
        return serverError(res, 'Failed to generate moon phase commentary');
    }
});

export default router;
