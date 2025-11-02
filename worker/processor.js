import { getMessageFromQueue } from "./shared/queue.js";
import { db } from "./shared/db.js";
import OpenAI from "openai";
import { selectTarotCards } from "./tarotDeck.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleChatJob(job) {
    const { userId, message } = job;
    const lowerMessage = message.toLowerCase();
    const isTarotQuery = lowerMessage.includes('tarot') || lowerMessage.includes('cards') || lowerMessage.includes('reading') || lowerMessage.includes('card draw');  // Define early
    let numCards = 1;  // Default to 1 card
    if (lowerMessage.includes('3 cards') || lowerMessage.includes('three cards') || lowerMessage.includes('3 card draw') || lowerMessage.includes('three card draw')) numCards = 3;
    else if (lowerMessage.includes('7 cards') || lowerMessage.includes('seven cards') || lowerMessage.includes('7 card draw') || lowerMessage.includes('seven card draw')) numCards = 7;
    else if (lowerMessage.includes('10 cards') || lowerMessage.includes('ten cards') || lowerMessage.includes('10 card draw') || lowerMessage.includes('ten card draw')) numCards = 10;
    else if (lowerMessage.includes('single card') || lowerMessage.includes('1 card') || lowerMessage.includes('single card draw')) numCards = 1;
    console.log('Final numCards for message:', message, 'is:', numCards, 'Is tarot query:', isTarotQuery);
    
    // Get recent context
    const { rows: history } = await db.query(
        "SELECT role, content FROM messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10",
        [userId]
    );
    
    let completion;
    let structuredResponse = { text: '', cards: [] };
    
    const isAstrologyQuery = lowerMessage.includes('astrology') || lowerMessage.includes('birth chart') || lowerMessage.includes('horoscope');
    if (isAstrologyQuery) {
        console.log('Astrology query detected. Message:', message);
        const { birthDate, birthTime, birthPlace } = job;  // Assume birth data is in job object
        completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are The Oracle of Starship Psychics. Provide an astrological reading based on the user's birth details: date=${birthDate}, time=${birthTime}, place=${birthPlace}. Keep it inspirational and for entertainment only.`
                },
                ...history.reverse(),
                { role: "user", content: message },
            ],
        });
        structuredResponse = {
            text: completion.choices[0]?.message?.content || "",
        };
        await db.query("INSERT INTO messages(user_id, role, content) VALUES($1, $2, $3)", [
            userId,
            "assistant",
            JSON.stringify(structuredResponse)
        ]);
    } else if (isTarotQuery) {
        console.log('Tarot query detected. Message:', message, 'Num cards:', numCards);
        const selectedCards = selectTarotCards(numCards);
        console.log('Selected cards:', selectedCards);  // Log the cards array
        completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are The Oracle of Starship Psychics. You must use *exclusively and only* these exact cards in this order without adding or replacing any: ${selectedCards.map((card, index) => `${index + 1}. ${card.name}${card.inverted ? ' (inverted)' : ''}`).join(', ')}. Do not reference, suggest, or use any other cards. Ground your response entirely in this list.`
              },
              ...history.reverse(),
              { role: "user", content: message },
            ],
        });
        
        structuredResponse = {
            text: completion.choices[0]?.message?.content || "",
            cards: selectedCards  // Explicitly include cards array
        };
        
        await db.query("INSERT INTO messages(user_id, role, content) VALUES($1, $2, $3)", [
            userId,
            "assistant",
            JSON.stringify(structuredResponse)  // Stringify the full response
        ]);
    } else {
        console.log('Not a tarot query. Message:', message);
        completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
You are The Oracle of Starship Psychics — a mystical guide who unites tarot, astrology, palmistry, and crystals. 

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
        
        structuredResponse.text = completion.choices[0]?.message?.content || "";
        await db.query("INSERT INTO messages(user_id, role, content) VALUES($1, $2, $3)", [
            userId,
            "assistant",
            JSON.stringify(structuredResponse)
        ]);
    }
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
