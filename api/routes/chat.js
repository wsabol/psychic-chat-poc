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

const router = Router();

router.post("/", verify2FA, async (req, res) => {
    const { message } = req.body;
    const userId = req.userId;

    await insertMessage(userId, 'user', message)

    await enqueueMessage({ userId, message });

    res.json({ status: "queued" });
});

router.get("/opening/:userId", authorizeUser, verify2FA, async (req, res) => {
    const userId = req.userId;

    try {
        // Check if an opening message was already sent today
        const today = new Date().toISOString().split('T')[0];
        const userIdHash = hashUserId(userId);
        const { rows: existingOpenings } = await db.query(
            `SELECT id, created_at FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'assistant' 
             AND created_at::date = $2::date
             ORDER BY created_at ASC 
             LIMIT 1`,
            [userIdHash, today]
        );

        // If we already have an assistant message from today (opening), return without adding another
        if (existingOpenings.length > 0) {
            return res.json({
                role: 'assistant',
                content: 'Opening already sent today'
            });
        }

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
            console.error('Error fetching personal info for greeting:', err);
        }

        let opening = await generatePsychicOpening({
            clientName: clientName,
            recentMessages: recentMessages,
        });

        if (opening === '') {
            opening = `Hi ${clientName}, thank you for being here today. Before we begin, is there an area of your life you're hoping to get clarity on?`;
        }

        await insertMessage(userId, 'assistant', opening)

        res.json({
            role: 'assistant',
            content: opening
        })
    } catch (err) {
        console.error('[CHAT] Error in opening endpoint:', err.message);
        res.status(500).json({ error: 'Failed to generate opening' });
    }
});

router.get("/history/:userId", authorizeUser, verify2FA, async (req, res) => {
    const userId = req.userId;
    // ✅ Using real encryption key from environment (re-encrypted in database)
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    try {
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query(
            `SELECT 
                id, 
                role, 
                pgp_sym_decrypt(content_encrypted, $2)::text as content
            FROM messages 
            WHERE user_id_hash=$1 
            ORDER BY created_at ASC`,
            [userIdHash, ENCRYPTION_KEY]
        );
        res.json(rows);
    } catch (err) {
        logger.error('Chat history query error:', err.message);
        res.status(500).json({ error: 'Database query error: ' + err.message });
    }
});

export default router;
