import { getMessageFromQueue } from "./shared/queue.js";
import { db } from "./shared/db.js";
import OpenAI from "openai";
import { tarotDeck } from "./tarotDeck.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to extract card names from oracle's response in the order they appear
function extractCardsFromResponse(responseText, deck) {
    const extractedCards = [];
    const foundCardIds = new Set(); // Track found card IDs to avoid duplicates
    
    // Find all bolded card names first (these are the actual cards drawn)
    // Look for **The Card Name** pattern
    const boldCardPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = [];
    let match;
    
    while ((match = boldCardPattern.exec(responseText)) !== null) {
        const boldedText = match[1].trim();
        // Check if this bolded text is an actual card name
        for (const card of deck) {
            const cardNameLower = card.name.toLowerCase();
            const boldedLower = boldedText.toLowerCase();
            
            // Match exact card name or card name without "The"
            if (cardNameLower === boldedLower || 
                cardNameLower === boldedLower.replace(/^the\s+/, '') ||
                cardNameLower.replace(/^the\s+/, '') === boldedLower ||
                cardNameLower.replace(/^the\s+/, '') === boldedLower.replace(/^the\s+/, '')) {
                boldMatches.push({
                    position: match.index,
                    cardName: boldedText,
                    card: card
                });
                break;
            }
        }
    }
    
    // If we found bolded card names, use those (they're explicit)
    if (boldMatches.length > 0) {
        // Sort by position and extract in order
        boldMatches.sort((a, b) => a.position - b.position);
        
        for (const boldMatch of boldMatches) {
            if (!foundCardIds.has(boldMatch.card.id)) {
                // Check if card is inverted by looking only immediately after the card name
                // Look for inversion keywords within 150 chars after the card mention
                const contextEnd = Math.min(responseText.length, boldMatch.position + 150);
                const contextAfter = responseText.substring(boldMatch.position, contextEnd).toLowerCase();
                
                // Also check immediately before for "reversed" modifiers
                const contextStart = Math.max(0, boldMatch.position - 100);
                const contextBefore = responseText.substring(contextStart, boldMatch.position).toLowerCase();
                
                // Look for explicit inversion patterns:
                // - "**The Card Name**: Reversed" or "Inverted"
                // - "The Card Name reversed" or "inverted"
                // - "reversed The Card Name"
                const hasReversedPattern = /reversed\s*–|inverted\s*–|upside\s*down\s*–/.test(contextAfter);
                const hasReversedKeyword = /\b(?:reversed|inverted|upside.?down)\b/.test(contextAfter.substring(0, 50));
                const hasReversedBefore = /(?:reversed|inverted|upside.?down)\s+the\s+\w+/.test(responseText.substring(contextStart, boldMatch.position));
                const isInverted = hasReversedPattern || hasReversedKeyword || hasReversedBefore;
                
                extractedCards.push({
                    ...boldMatch.card,
                    inverted: isInverted
                });
                foundCardIds.add(boldMatch.card.id);
            }
        }
    }
    
    // If no bolded matches found, fall back to word-boundary regex matching
    if (extractedCards.length === 0) {
        const cleanText = responseText.replace(/\*\*|__|\*|_/g, '');
        const lowerText = cleanText.toLowerCase();
        const cardMentions = [];
        
        for (const card of deck) {
            const cardName = card.name.toLowerCase();
            const nameWithoutThe = cardName.replace(/^the /, '');
            
            // Use regex with word boundaries to match only complete card names
            const variations = [
                new RegExp(`\\bthe\\s+${escapeRegex(nameWithoutThe)}\\b`, 'gi'),
                new RegExp(`\\b${escapeRegex(cardName)}\\b`, 'gi')
            ];
            
            for (const variation of variations) {
                let regexMatch;
                while ((regexMatch = variation.exec(lowerText)) !== null && !foundCardIds.has(card.id)) {
                    const position = regexMatch.index;
                    
                    // Check if card is inverted
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
                    break;
                }
            }
        }
        
        cardMentions.sort((a, b) => a.position - b.position);
        return cardMentions.map(mention => mention.card);
    }
    
    return extractedCards;
}

// Helper function to escape special regex characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
- Cards are shuffled with a 50% chance of appearing reversed (inverted) - this means for every 2 cards drawn, approximately 1 should be reversed
- YOU MUST actively include card reversals in your draws. DO NOT draw only upright cards - this is unrealistic and breaks immersion
- When a card IS reversed, ALWAYS note it explicitly: "The Two of Wands reversed" or "The Knight of Pentacles inverted"
- For longer spreads (5+ cards), aim for a natural distribution: roughly 40-60% of cards reversed
- For every 5 cards: expect 2-3 reversals. For every 7 cards: expect 3-4 reversals. For every 10 cards: expect 4-6 reversals
- Do NOT default to all upright cards. Reversals add depth, nuance, and create more meaningful readings
- Provide mystical interpretation of each card as they relate to the user's question, acknowledging reversed meanings when applicable

TAROT SPREAD GUIDELINES:
- Common draws include 1, 3, 5, 7, and 10 card spreads
- Use your intuition to select the number of cards based on the conversation:
  * 1 card: Quick daily insight, simple yes/no questions, or initial guidance
  * 3 cards: Classic spread for past/present/future, mind/body/spirit, or situation/action/outcome
  * 5 cards: Deeper exploration of a situation with multiple perspectives
  * 7 cards: Comprehensive readings for complex questions (e.g., Celtic Cross style)
  * 10 cards: Full deep-dive readings for major life decisions or detailed inquiries
- If the user requests a specific number of cards or type of spread, honor their request
- As conversations deepen and follow-up questions emerge, consider drawing additional cards for more detailed insights
- Each spread should match the emotional and intellectual depth of what the user is seeking

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
    
    // Strip metadata from cards - only keep id, name, and inverted status
    const cleanedCards = mentionedCards.map(card => ({
        id: card.id,
        name: card.name,
        inverted: card.inverted
    }));
    
    // Structure the response with both text and any cards that were mentioned
    const structuredResponse = {
        text: oracleResponse,
        cards: cleanedCards
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
