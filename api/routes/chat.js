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

    let opening = await generatePsychicOpening({
        clientName: userId,
        recentMessages: recentMessages,
    });

    if (opening === '') {
        opening = `Hi ${userId}, thank you for being here today. Before we begin, is there an area of your life you're hoping to get clarity on?`;
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
