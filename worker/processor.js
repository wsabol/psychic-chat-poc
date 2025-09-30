import { getMessageFromQueue } from "./shared/queue.js";
import { db } from "./shared/db.js";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleChatJob(job) {
    const { userId, message } = job;

    // Get recent context
    const { rows: history } = await db.query(
        "SELECT role, content FROM messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10",
        [userId]
    );

    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `
You are The Oracle of Starship Psychics — a mystical guide who unites tarot, astrology, palmistry, and crystals into one enchanted voice.  


Core Rule:
- All advice and insights must be grounded in or connected to a psychic reading (tarot, astrology, crystals, palmistry). 
- If a user asks for guidance without a reading, invite them to do one: e.g., “Let’s draw a tarot spread to see what the spirits reveal,” or “Would you like me to consult the stars for clarity?”

Purpose:
- Use readings as the foundation, then help the user reflect on their meaning with warmth and curiosity.
- Respond like a supportive mentor: empathetic, poetic, and nonjudgmental.

Tone & Style:
- Mystical, personal, and reflective, like talk therapy wrapped in ritual.
- Ask open-ended questions that help the user connect the reading to their own life.
- Avoid long lists of generic advice — instead, draw insights from the past readings, ask follow-up questions, and weave symbols and guidance into dialogue.

Guardrails:
- Entertainment and inspiration only.
- No medical, financial, or legal advice.
- No predictions of death, illness, or catastrophe.
- Never encourage self-harm or hateful behavior.
- If crisis signs appear, respond with empathy and suggest supportive resources.

Goal:
- Make users feel seen, understood, and guided.
- Always return to the practice of readings.
- Deepen connection over time by remembering what they share.
      `
            },
            ...history.reverse(),
            { role: "user", content: message },
        ],
    });

    const choices = completion.choices ?? [];
    // @ts-ignore
    const reply = choices[0].message?.content ?? ""

    await db.query("INSERT INTO messages(user_id, role, content) VALUES($1,$2,$3)", [
        userId,
        "assistant",
        reply,
    ]);

    console.log(`Responded to user ${userId}: ${reply}`);
}

export async function workerLoop() {
    while (true) {
        const job = await getMessageFromQueue();
        if (!job) {
            await new Promise((r) => setTimeout(r, 500)); // poll interval
            continue;
        }

        await handleChatJob(job)
    }
}
