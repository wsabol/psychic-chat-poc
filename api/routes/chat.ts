import { Router } from "express";
import { enqueueMessage } from "../shared/queue.ts";
import { generatePsychicOpening } from "../shared/opening.ts";
import { getRecentMessages, insertMessage } from "../shared/user.ts";
import { db } from "../shared/db.ts";

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
        opening = `Hi ${userId}, thank you for being here today. Before we begin, is there an area of your life you’re hoping to get clarity on?`;
    }

    await insertMessage(userId, 'assistant', opening)

    res.json({
        message: opening
    })
});

router.get("/history/:userId", async (req, res) => {
    const { userId } = req.params;
    const { rows } = await db.query(
        "SELECT id, role, content FROM messages WHERE user_id=$1 ORDER BY created_at ASC",
        [userId]
    );
    res.json(rows);
});

export default router;
