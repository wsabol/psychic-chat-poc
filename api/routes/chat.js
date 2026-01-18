import { Router } from "express";
import logger from "../shared/logger.js";
import { authorizeUser, verify2FA } from "../middleware/auth.js";
import { enqueueMessage } from "../shared/queue.js";
import { generatePsychicOpening } from "../shared/opening.js";
import { getRecentMessages, insertMessage } from "../shared/user.js";
import { db } from "../shared/db.js";
import { containsHealthContent, detectHealthKeywords, getBlockedResponse } from "../shared/healthGuardrail.js";
import { logAudit } from "../shared/auditLog.js";
import { hashUserId } from "../shared/hashUtils.js";
import { validationError, serverError, noContentResponse } from "../utils/responses.js";
import { getLocalDateForTimezone } from "../shared/timezoneHelper.js";
import { logErrorFromCatch } from "../shared/errorLogger.js";

const router = Router();

router.post("/", verify2FA, async (req, res) => {
    const { message } = req.body;
    const userId = req.userId;

    try {
                // Store user message with proper encryption
        const userContent = { text: message };
        const userIdHash = hashUserId(userId);
        const { rows: tzRows } = await db.query(
            `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userTimezone = tzRows.length > 0 && tzRows[0].timezone ? tzRows[0].timezone : 'UTC';
        await insertMessage(userId, 'user', userContent, null, userTimezone);
        
        // Enqueue for worker processing
        await enqueueMessage({ userId, message });

        res.json({ status: "queued" });
        } catch (err) {
        logErrorFromCatch(err, 'app', 'chat');
        return serverError(res, 'Failed to process message');
    }
});

router.get("/opening/:userId", authorizeUser, verify2FA, async (req, res) => {
    const userId = req.userId;

        try {
        // Get user's local timezone date
        const userIdHash = hashUserId(userId);
        const { rows: tzRows } = await db.query(
            `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userTimezone = tzRows.length > 0 && tzRows[0].timezone ? tzRows[0].timezone : 'UTC';
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
        // Old code to remove:
        // const today = new Date().toISOString().split('T')[0];
                const { rows: existingOpenings } = await db.query(
            `SELECT id, created_at FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'assistant' 
             AND created_at_local_date = $2
             ORDER BY created_at ASC 
             LIMIT 1`,
            [userIdHash, todayLocalDate]
        );

                        // If we already have an assistant message from today (opening), don't create a new one
        if (existingOpenings.length > 0) {
            return noContentResponse(res);
        }

        // Fetch user's language preference
                const { rows: prefRows } = await db.query(
            `SELECT language, oracle_language FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const oracleLanguage = prefRows.length > 0 ? prefRows[0].oracle_language : 'en-US';

        // Only generate opening if no messages exist yet OR if last message was from user
        const recentMessages = await getRecentMessages(userId)
        
        // Fetch user's personal information for personalized greeting
        let clientName = userId;
        try {
            const { rows: personalInfoRows } = await db.query(
                "SELECT pgp_sym_decrypt(first_name_encrypted, $1) as first_name, pgp_sym_decrypt(familiar_name_encrypted, $1) as familiar_name FROM user_personal_info WHERE user_id = $2",
                [process.env.ENCRYPTION_KEY, userId]
            );
            if (personalInfoRows.length > 0 && personalInfoRows[0]) {
                clientName = personalInfoRows[0].familiar_name || personalInfoRows[0].first_name || userId;
            }
        } catch (err) {
        }

                        let opening = await generatePsychicOpening({
            clientName: clientName,
            recentMessages: recentMessages,
            oracleLanguage: oracleLanguage
        });

        // Store opening as proper content object
        let openingContent = { text: opening };

        if (opening === '') {
            opening = `Hi ${clientName}, thank you for being here today. Before we begin, is there an area of your life you're hoping to get clarity on?`;
            openingContent.text = opening;
        }

        await insertMessage(userId, 'assistant', openingContent, null, userTimezone);

        res.json({
            role: 'assistant',
            content: opening
        })
    } catch (err) {
        return serverError(res, 'Failed to generate opening');
    }
});

/**
 * GET /chat/history/:userId
 * Returns chat history for the user
 */
router.get("/history/:userId", authorizeUser, verify2FA, async (req, res) => {
    const userId = req.userId;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    try {
        const userIdHash = hashUserId(userId);
        
                // Fetch messages from database
        // Safe decrypt: handle NULL values gracefully with COALESCE
                const query = `SELECT 
            id, 
            role, 
            language_code,
            pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
            pgp_sym_decrypt(content_brief_encrypted, $2)::text as brief_full
        FROM messages 
        WHERE user_id_hash = $1 
        ORDER BY created_at ASC`;
        
        const { rows } = await db.query(query, [userIdHash, ENCRYPTION_KEY]);
        
                // Transform: format for frontend
        const transformedRows = rows.map(msg => {
            let fullContent = msg.content_full;
            let briefContent = msg.brief_full;
            
                        // Parse JSON if valid (skip if null or empty object string)
            try {
                if (fullContent && fullContent !== '{}' && fullContent !== null) {
                    fullContent = JSON.parse(fullContent);
                }
            } catch (e) {
                // Keep as string if not JSON
            }
            try {
                if (briefContent && briefContent !== '{}') briefContent = JSON.parse(briefContent);
            } catch (e) {
                // Keep as string if not JSON
            }
            
                        return {
                id: msg.id,
                role: msg.role,
                language_code: msg.language_code,
                content: fullContent || briefContent,
                brief_content: briefContent  // DO NOT fallback to fullContent - greetings have NO brief
            };
        });
        
        res.json(transformedRows);
                } catch (err) {
        logErrorFromCatch(err, 'app', 'chat');
        return serverError(res, 'Failed to retrieve message history');
    }
});

export default router;
