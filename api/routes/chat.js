import { Router } from "express";
import { enqueueMessage } from "../shared/queue.js";
import { generatePsychicOpening } from "../shared/opening.js";
import { getRecentMessages, insertMessage } from "../shared/user.js";
import { db } from "../shared/db.js";

const router = Router();

router.post("/", async (req, res) => {
    const { userId, message } = req.body;

    await insertMessage(userId, 'user', message)

    await enqueueMessage({ userId, message });

    res.json({ status: "queued" });
});

router.get("/opening/:userId", async (req, res) => {
    const { userId } = req.params;

    const recentMessages = await getRecentMessages(userId)
    
    // Fetch user's personal information for personalized greeting
    let clientName = userId;
    try {
        const { rows: personalInfoRows } = await db.query(
            "SELECT first_name, address_preference FROM user_personal_info WHERE user_id = $1",
            [userId]
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

router.get("/history/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const { rows } = await db.query(
            "SELECT id, role, content FROM messages WHERE user_id=$1 ORDER BY created_at ASC",
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Query error for messages table:', err);
        res.status(500).json({ error: 'Database query error: ' + err.message });
    }
});

export default router;
