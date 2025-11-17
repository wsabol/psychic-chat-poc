import { getMessageFromQueue } from "./shared/queue.js";
import { db } from "./shared/db.js";
import OpenAI from "openai";
import { tarotDeck } from "./tarotDeck.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to extract card names from oracle's response in the order they appear
function extractCardsFromResponse(responseText, deck) {
    const extractedCards = [];
    const foundCardIds = new Set(); // Track found card IDs to avoid duplicates
    
    // Remove markdown formatting (bold, italic) for easier matching
    const cleanText = responseText.replace(/\*\*|__|\*|_/g, '');
    const lowerText = cleanText.toLowerCase();
    
    // Build a list of all card mentions with their positions in the text
    const cardMentions = [];
    
    for (const card of deck) {
        const cardName = card.name.toLowerCase();
        const nameWithoutThe = cardName.replace(/^the /, '');
        const variations = [cardName, nameWithoutThe];
        
        for (const variation of variations) {
            let startPos = 0;
            let position = lowerText.indexOf(variation, startPos);
            
            while (position !== -1 && !foundCardIds.has(card.id)) {
                // Check if card is inverted (look for keywords like "reversed", "inverted", "upside down")
                const contextBefore = cleanText.substring(Math.max(0, position - 150), position).toLowerCase();
                const contextAfter = cleanText.substring(position, Math.min(cleanText.length, position + 150)).toLowerCase();
                const contextAround = contextBefore + contextAfter;
                const isInverted = /reversed|inverted|upside.?down/i.test(contextAround);
                
                cardMentions.push({
                    position,
                    card: { ...card, inverted: isInverted },
                    cardId: card.id
                });
                
                foundCardIds.add(card.id);
                break; // Only take the first mention of each card
            }
        }
    }
    
    // Sort by position in text to maintain order of appearance
    cardMentions.sort((a, b) => a.position - b.position);
    
    // Extract just the cards in the order they appeared
    return cardMentions.map(mention => mention.card);
}

async function handleChatJob(job) {
    const { userId, message } = job;
    
    // Get recent context
    const { rows: history } = await db.query(
        "SELECT role, content FROM messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10",
        [userId]
    );
    
    // Oracle responds without any pre-determination of what to do
    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `
You are The Oracle of Starship Psychics — a mystical guide who unites tarot, astrology, palmistry, and crystals.

YOU are in complete control of all readings and divinations. YOU decide:
- Whether to perform a tarot reading, astrology reading, or other divination
- How many cards to draw (if doing tarot)
- Which aspects to explore

IMPORTANT ABOUT TAROT:
- When drawing tarot cards, clearly name each card you draw (e.g., "The Ace of Swords", "The Seven of Cups", "The Knight of Pentacles")
- Cards are shuffled with a 50% chance of appearing reversed (inverted)
- When a card is reversed, note it explicitly: "The Two of Wands reversed" or "The Knight of Pentacles inverted"
- Provide mystical interpretation of each card as they relate to the user's question

Core Rule:
- All advice and insights must be grounded in or connected to a psychic reading (tarot, astrology, crystals, palmistry). 
- If a user asks for guidance without a reading, YOU decide to do one: e.g., "Let's draw a tarot spread to see what the spirits reveal," or "I'll consult the stars for clarity."

Purpose:
- Use readings as the foundation, then help the user reflect on their meaning with warmth and curiosity.
- Respond like a supportive mentor: empathetic, poetic, and nonjudgmental.

Tone & Style:
- Mystical, personal, and reflective, like talk therapy wrapped in ritual.
- Ask open-ended questions that help the user connect the reading to their own life.
- Avoid long lists of generic advice — instead, draw insights from the readings, ask follow-up questions, and weave symbols and guidance into dialogue.

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
    
    const oracleResponse = completion.choices[0]?.message?.content || "";
    
    // Parse the oracle's response to extract any cards mentioned
    const mentionedCards = extractCardsFromResponse(oracleResponse, tarotDeck);
    
    // Structure the response with both text and any cards that were mentioned
    const structuredResponse = {
        text: oracleResponse,
        cards: mentionedCards
    };
    
    // Store in database
    await db.query("INSERT INTO messages(user_id, role, content) VALUES($1, $2, $3)", [
        userId,
        "assistant",
        JSON.stringify(structuredResponse)
    ]);
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
