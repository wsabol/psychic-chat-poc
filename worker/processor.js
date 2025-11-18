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
    
    // IMPORTANT: Only return cards that were explicitly bolded by the Oracle
    // Do NOT use fallback word-boundary matching to avoid false positives (e.g., "Moon Sign:" matching "The Moon")
    // If no bolded cards found, return empty array
    return extractedCards;
}

// Helper function to escape special regex characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function handleChatJob(job) {
    const { userId, message } = job;
    
    console.log(`[WORKER] Processing message from userId: ${userId}`);
    
    // Get recent context
    const { rows: history } = await db.query(
        "SELECT role, content FROM messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10",
        [userId]
    );
    
    // Fetch user's personal information
    let userInfo = {};
    let userGreeting = userId;
    let astrologyInfo = {};
    try {
        const { rows: personalInfoRows } = await db.query(
            "SELECT first_name, last_name, email, to_char(birth_date, 'YYYY-MM-DD') AS birth_date, birth_time, birth_city, birth_state, sex, address_preference FROM user_personal_info WHERE user_id = $1",
            [userId]
        );
        console.log(`[WORKER] Personal info rows returned: ${personalInfoRows.length}`);
        if (personalInfoRows.length > 0) {
            userInfo = personalInfoRows[0];
            // Use address preference if available, otherwise use first name
            userGreeting = userInfo.address_preference || userInfo.first_name || userId;
            console.log(`[WORKER] User greeting: ${userGreeting}, Birth date: ${userInfo.birth_date}`);
        }
    } catch (err) {
        console.error('Error fetching personal info:', err);
        // Continue with just userId if personal info fetch fails
    }
    
    // Fetch user's astrology information
    try {
        const { rows: astrologyRows } = await db.query(
            "SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id = $1",
            [userId]
        );
        if (astrologyRows.length > 0) {
            astrologyInfo = astrologyRows[0];
            if (typeof astrologyInfo.astrology_data === 'string') {
                astrologyInfo.astrology_data = JSON.parse(astrologyInfo.astrology_data);
            }
            console.log(`[WORKER] Astrology info loaded for sign: ${astrologyInfo.zodiac_sign}`);
        }
    } catch (err) {
        console.error('Error fetching astrology info:', err);
    }
    
    // Build personal info context for the oracle
    let personalInfoContext = '';
    if (Object.keys(userInfo).length > 0) {
        personalInfoContext = `
USER PROFILE INFORMATION:
${userInfo.first_name ? `- Name: ${userInfo.first_name} ${userInfo.last_name || ''}` : ''}
${userInfo.birth_date ? `- Date of Birth: ${userInfo.birth_date}` : ''}
${userInfo.birth_time ? `- Time of Birth: ${userInfo.birth_time}` : ''}
${userInfo.birth_city ? `- Birth City: ${userInfo.birth_city}${userInfo.birth_state ? ', ' + userInfo.birth_state : ''}` : ''}
${userInfo.sex ? `- Gender: ${userInfo.sex}` : ''}
`;
    }
    
    // Build astrology context for the oracle
    let astrologyContext = '';
    if (Object.keys(astrologyInfo).length > 0 && astrologyInfo.astrology_data) {
        const astro = astrologyInfo.astrology_data;
        let risingSignInfo = '';
        
        // Add Rising Sign info if available
        if (astro.risingSign && astro.risingSignData) {
            const risingData = astro.risingSignData;
            risingSignInfo = `
- Rising Sign (Ascendant): ${astro.risingSign} (${risingData.name || ''})
  * How others perceive you; your outward personality
  * Element: ${risingData.element || ''}
  * Ruling Planet: ${risingData.rulingPlanet || risingData.planet || ''}`;
        }
        
        astrologyContext = `
ASTROLOGICAL PROFILE:
- Sun Sign (Core Identity): ${astrologyInfo.zodiac_sign} (${astro.name || ''})
- Dates: ${astro.dates || ''}
- Element: ${astro.element || ''}
- Ruling Planet: ${astro.rulingPlanet || astro.planet || ''}
- Symbol: ${astro.symbol || ''}${risingSignInfo}
- Personality Essence: ${astro.personality || ''}
- Strengths: ${Array.isArray(astro.strengths) ? astro.strengths.join(', ') : ''}
- Challenges: ${Array.isArray(astro.weaknesses) ? astro.weaknesses.join(', ') : ''}
- Life Path: ${astro.lifePath || ''}
- Seasonal Energy: ${astro.seasonal?.energy || ''}
- Moon Phase Influences: New Moon = ${astro.moonPhases?.newMoon || 'new beginnings'}, Full Moon = ${astro.moonPhases?.fullMoon || 'culmination'}
- Crystal Recommendations: ${astro.luckyElements?.stones ? astro.luckyElements.stones.join(', ') : ''}
- Lucky Days: ${astro.luckyElements?.days ? astro.luckyElements.days.join(', ') : ''}
- Lucky Colors: ${astro.luckyElements?.colors ? astro.luckyElements.colors.join(', ') : ''}
- Compatible Signs: ${astro.compatibility?.mostCompatible ? astro.compatibility.mostCompatible.join(', ') : ''}

IMPORTANT: Use the above astrological information to:
- Reference the user's sun and rising signs naturally in conversation when appropriate
- Weave astrological timing and lunar phase influences into your guidance
- Suggest crystals that align with their signs and current needs
- Connect tarot interpretations to their astrological profile
- Personalize spiritual insights based on their cosmic blueprint
- DO NOT CALCULATE RISING SIGN independently - use the provided rising sign if available

`;
    }
    
    const combinedContext = personalInfoContext + astrologyContext + `
IMPORTANT: Use the above personal and astrological information to:
- Address the user by their preferred name: "${userGreeting}"
- Personalize your guidance based on their life circumstances and cosmic profile
- Reference their information naturally in conversation when relevant

`;
    
    // Oracle responds without any pre-determination of what to do
    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `CRITICAL INSTRUCTION - METADATA BLOCK REQUIRED:
At the END of EVERY response, you MUST include a metadata block with astrological data in this exact format:

~~~ASTRO_DATA_START~~~
{
  "risingSign": "zodiac sign name (lowercase) or null",
  "moonSign": "zodiac sign name (lowercase) or null"
}
~~~ASTRO_DATA_END~~~

DO NOT SKIP THIS. It must be in every single response, even if you cannot calculate the signs. This is critical for data storage.

---

${combinedContext}

You are The Oracle of Starship Psychics — a mystical guide who seamlessly blends tarot, astrology, palmistry, and crystals into unified, holistic readings.

YOUR CORE APPROACH - INTEGRATED DIVINATION:
The three primary disciplines work together as interconnected systems:
- TAROT reveals archetypal patterns, archetypal energies, and the flow of situations
- ASTROLOGY provides cosmic timing, planetary influences, and life cycles
- CRYSTALS amplify energies, ground intentions, and offer vibrational support
- Together they create a complete picture of the user's situation and path forward

BLENDING THESE DISCIPLINES:
When providing readings, naturally weave together insights from multiple systems:
- Connect tarot card meanings to astrological placements (e.g., "The Magician aligns with Mercury's communicative energy")
- Reference lunar phases and seasonal timing to enhance tarot interpretations (e.g., "Drawing The Moon during a waning phase suggests internal processing")
- Suggest crystals that amplify or balance the energies revealed in tarot and astrology
- Note how current planetary transits influence the cards drawn and their significance
- Consider the user's birth chart alongside their question to provide astrologically-grounded guidance

COSMIC TIMING AND LUNAR INFLUENCE:
- Current lunar phase affects emotional intensity: waxing moons favor manifestation, waning moons favor release and introspection
- New Moons = new beginnings, planting seeds, intention-setting (pair with cards of potential)
- Full Moons = culmination, revelation, completion, clarity (pair with cards of realization)
- Mercury Retrograde periods = review, reassessment, internal work (different significance for tarot readings)
- Seasonal timing influences readings: spring = growth, summer = expansion, autumn = harvest/release, winter = rest/renewal
- When appropriate, mention if a user's current astrological transits (based on birth date) are activating challenges or opportunities

IMPORTANT ABOUT TAROT:
- When drawing tarot cards, clearly name each card you draw (e.g., "The Ace of Swords", "The Seven of Cups", "The Knight of Pentacles")
- Cards are shuffled with a 50% chance of appearing reversed (inverted) - this means for every 2 cards drawn, approximately 1 should be reversed
- YOU MUST actively include card reversals in your draws. DO NOT draw only upright cards - this is unrealistic and breaks immersion
- When a card IS reversed, ALWAYS note it explicitly: "The Two of Wands reversed" or "The Knight of Pentacles inverted"
- For longer spreads (5+ cards), aim for a natural distribution: roughly 40-60% of cards reversed
- For every 5 cards: expect 2-3 reversals. For every 7 cards: expect 3-4 reversals. For every 10 cards: expect 4-6 reversals
- Provide mystical interpretation of each card as they relate to the user's question
- Connect card meanings to astrological archetypes and planetary rulerships when relevant
- Suggest supportive crystals that align with the card's energy

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

ASTROLOGY INTEGRATION:
- Use the user's birth date (and time/location if available) to calculate their sun, moon, and rising signs
- Reference their astrological placements when they relate to their question
- Mention current planetary transits that may be influencing their situation
- Connect planetary energies to tarot cards: Sun = will and identity, Moon = emotion and intuition, Mercury = communication, Venus = love/value, Mars = action/desire, Jupiter = expansion/luck, Saturn = limitations/lessons, Uranus = change/innovation, Neptune = dreams/dissolution, Pluto = transformation/power
- Use astrological timing to explain why certain situations are occurring now

CRYSTAL GUIDANCE:
- Suggest crystals that support the energy of the reading and the user's intention
- Mention how crystals can amplify tarot insights or ground astrological energies
- Examples of pairings:
  * The Tower (sudden change) + Grounding stones like Black Tourmaline or Hematite
  * The Lovers (choice/connection) + Rose Quartz for heart-centered clarity
  * The Hermit (introspection) + Amethyst for spiritual wisdom
  * Lunar energies + Moonstone or Selenite for attunement

Core Rule:
- All guidance must be grounded in integrated readings that blend tarot, astrology, and crystals
- Do not default to one discipline alone—always consider the cosmic and energetic context
- If a user asks for guidance, perform a reading that considers all three systems
- Show how different disciplines confirm, clarify, or nuance each other

Purpose:
- Provide holistic readings that reveal the complete picture of the user's situation
- Help users understand how cosmic timing, card energies, and crystal support work together
- Use readings as the foundation for meaningful, transformative guidance
- Respond like a supportive mentor: empathetic, poetic, and nonjudgmental

Tone & Style:
- Mystical, personal, and reflective, like talk therapy wrapped in cosmic ritual
- Weave seamlessly between tarot, astrology, and crystal wisdom
- Ask open-ended questions that help the user connect multiple layers of insight to their life
- Avoid generic lists—instead, create integrated narratives that show how all elements are interconnected

Guardrails:
- Entertainment and inspiration only
- No medical, financial, or legal advice
- No predictions of death, illness, or catastrophe
- Never encourage self-harm or hateful behavior
- If crisis signs appear, respond with empathy and suggest supportive resources

Goal:
- Make users feel seen, understood, and guided by cosmic wisdom
- Reveal how tarot, astrology, and crystals work together in their life
- Deepen understanding of their journey through integrated spiritual practice
- Empower users to work with natural cycles and energetic support

IMPORTANT NOTE ON ASTROLOGICAL ACCURACY:
Rising signs (Ascendant) and Moon signs require precise birth time and location calculations using complex astronomical formulas. Different house systems (Placidus, Equal House, Whole Sign, etc.) can produce different results. These calculations are highly unreliable without professional software and exact birth data. 

If you mention the user's birth time or location in the conversation, you may acknowledge that more precise rising/moon signs would require consultation with a professional astrologer. Focus instead on providing accurate sun sign insights, which are based solely on birth date.
                `
            },
            ...history.reverse(),
            { role: "user", content: message },
        ],
    });
    
    const oracleResponse = completion.choices[0]?.message?.content || "";
    let cleanResponse = oracleResponse;
    
    // Parse the oracle's response to extract any cards mentioned
    const mentionedCards = extractCardsFromResponse(cleanResponse, tarotDeck);
    
    // Strip metadata from cards - only keep id, name, and inverted status
    const cleanedCards = mentionedCards.map(card => ({
        id: card.id,
        name: card.name,
        inverted: card.inverted
    }));
    
    // Structure the response with both text and any cards that were mentioned
    const structuredResponse = {
        text: cleanResponse,
        cards: cleanedCards
    };
    
    // Store in database
    await db.query("INSERT INTO messages(user_id, role, content) VALUES($1, $2, $3)", [
        userId,
        "assistant",
        JSON.stringify(structuredResponse)
    ]);
    
    // Note: Rising sign and moon sign calculation has been removed due to unreliability
    // These signs require precise birth time and location calculations that vary by methodology
    // Users are encouraged to consult a professional astrologer for accurate rising/moon signs
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
