import { Router } from "express";
import { authorizeUser, verify2FA } from "../middleware/auth.js";
import { enqueueMessage } from "../shared/queue.js";
import { generatePsychicOpening } from "../shared/opening.js";
import { getRecentMessages, insertMessage } from "../shared/user.js";
import { db } from "../shared/db.js";
import { containsHealthContent, detectHealthKeywords, getBlockedResponse } from "../shared/healthGuardrail.js";
import { logAudit } from "../shared/auditLog.js";

const router = Router();

router.post("/", verify2FA, async (req, res) => {
    const { message } = req.body;
    const userId = req.userId;

    // Health content guardrail check
    if (containsHealthContent(message)) {
        const keywords = detectHealthKeywords(message);
        console.log(`[HEALTH-GUARD] Blocked health content: ${keywords.join(', ')}`);
        
        // Log to audit trail
        await logAudit(db, {
            userId,
            action: 'CHAT_MESSAGE_BLOCKED_HEALTH',
            resourceType: 'chat',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            httpMethod: req.method,
            endpoint: req.path,
            status: 'BLOCKED',
            details: { keywords }
        }).catch(e => console.error('[AUDIT] Error logging:', e.message));
        
        return res.status(400).json({
            success: false,
            error: getBlockedResponse().message,
            reason: 'health_content_blocked'
        });
    }

    await insertMessage(userId, 'user', message)

    await enqueueMessage({ userId, message });

    res.json({ status: "queued" });
});

router.get("/opening/:userId", authorizeUser, verify2FA, async (req, res) => {
    const userId = req.userId;

    const recentMessages = await getRecentMessages(userId)
    
    // Fetch user's personal information for personalized greeting
    let clientName = userId;
    try {
        const { rows: personalInfoRows } = await db.query(
                        "SELECT pgp_sym_decrypt(first_name_encrypted, $1) as first_name, pgp_sym_decrypt(address_preference_encrypted, $1) as address_preference FROM user_personal_info WHERE user_id = $2",
            [process.env.ENCRYPTION_KEY, userId]
        );
        if (personalInfoRows.length > 0 && personalInfoRows[0]) {
            // Use address preference if available, otherwise use first name
            clientName = personalInfoRows[0].address_preference || personalInfoRows[0].first_name || userId;
        }
    } catch (err) {
        console.error('Error fetching personal info for greeting:', err);
        // Continue with userId if fetch fails
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
});

router.get("/history/:userId", authorizeUser, verify2FA, async (req, res) => {
    const userId = req.userId;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';
    try {
        const { rows } = await db.query(
            `SELECT 
                id, 
                role, 
                CASE 
                    WHEN content_encrypted IS NOT NULL 
                    THEN pgp_sym_decrypt(content_encrypted, $2)::text
                    ELSE content
                END as content
            FROM messages 
            WHERE user_id=$1 
            ORDER BY created_at ASC`,
            [userId, ENCRYPTION_KEY]
        );
        res.json(rows);
    } catch (err) {
        console.error('Query error for messages table:', err);
        res.status(500).json({ error: 'Database query error: ' + err.message });
    }
});

export default router;
