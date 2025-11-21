import { getMessageFromQueue } from "./shared/queue.js";
import { db } from "./shared/db.js";
import OpenAI from "openai";
import { tarotDeck } from "./tarotDeck.js";
import { spawn } from "child_process";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to call Python astrology script
function calculateBirthChartAsync(birthData) {
    return new Promise((resolve, reject) => {
        const python = spawn('/opt/venv/bin/python3', ['./astrology.py']);
        
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => {
            outputData += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`[WORKER] Python script exited with code ${code}`);
                if (errorData) console.error(`[WORKER] Python stderr:`, errorData);
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            
            try {
                const result = JSON.parse(outputData);
                if (result.error) {
                    console.warn(`[WORKER] Astrology calculation warning: ${result.error}`);
                }
                resolve(result);
            } catch (e) {
                console.error(`[WORKER] Failed to parse astrology result:`, outputData);
                reject(new Error(`Invalid JSON from astrology script: ${e.message}`));
            }
        });
        
        python.on('error', (err) => {
            console.error(`[WORKER] Failed to spawn Python process:`, err);
            reject(err);
        });
        
        // Send birth data to Python script
        python.stdin.write(JSON.stringify(birthData));
        python.stdin.end();
    });
}

// Helper function to get current moon phase
function getCurrentMoonPhaseAsync() {
    return new Promise((resolve, reject) => {
        const python = spawn('/opt/venv/bin/python3', ['./astrology.py']);
        
        let outputData = '';
        let errorData = '';
        
        python.stdout.on('data', (data) => {
            outputData += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`[WORKER] Python moon phase script exited with code ${code}`);
                if (errorData) console.error(`[WORKER] Python stderr:`, errorData);
                reject(new Error(`Python script failed: ${errorData}`));
                return;
            }
            
            try {
                const result = JSON.parse(outputData);
                resolve(result);
            } catch (e) {
                console.error(`[WORKER] Failed to parse moon phase result:`, outputData);
                reject(new Error(`Invalid JSON from astrology script: ${e.message}`));
            }
        });
        
        python.on('error', (err) => {
            console.error(`[WORKER] Failed to spawn Python process:`, err);
            reject(err);
        });
        
        // Send moon phase request to Python script
        python.stdin.write(JSON.stringify({ type: 'moon_phase' }));
        python.stdin.end();
    });
}

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
        
        // Skip position labels (Past, Present, Future, etc.)
        if (/^(past|present|future|position|spread|card\s*\d+)$/i.test(boldedText)) {
            continue;
        }
        
        // Strip (Reversed)/(Inverted) and "Card" suffix for matching
        const cleanedText = boldedText
            .replace(/\s*\([^)]*\)\s*$/g, '') // Remove (Reversed), (Inverted), etc.
            .replace(/\s+card\s*$/i, '') // Remove " Card" suffix
            .trim();
        
        if (!cleanedText) continue; // Skip if nothing left after cleaning
        
        // Check if this bolded text is an actual card name
        for (const card of deck) {
            const cardNameLower = card.name.toLowerCase();
            const cleanedLower = cleanedText.toLowerCase();
            const boldedLower = boldedText.toLowerCase();
            
            // Match exact card name or card name without "The"
            if (cardNameLower === cleanedLower || 
                cardNameLower === cleanedLower.replace(/^the\s+/, '') ||
                cardNameLower.replace(/^the\s+/, '') === cleanedLower ||
                cardNameLower.replace(/^the\s+/, '') === cleanedLower.replace(/^the\s+/, '')) {
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
                                // Check if card is inverted by looking ONLY immediately after the card name
                // IMPORTANT: Limit window to avoid picking up next card's inversion status
                // Only look within 40 chars after card (e.g., " (Reversed)" or " reversed")
                const contextEnd = Math.min(responseText.length, boldMatch.position + 40);
                const contextAfter = responseText.substring(boldMatch.position, contextEnd).toLowerCase();
                
                // Look for explicit inversion patterns ONLY in immediate context:
                // - "**The Card Name** (Reversed)" - most common
                // - "**The Card Name** reversed" - alternative
                // - "**The Card Name** inverted" - alternative
                // Pattern: must be close to card name, separated by space/punctuation only
                const hasReversedPattern = /\b(?:reversed|inverted|upside[\s-]*down)\b/.test(contextAfter);
                const isInverted = hasReversedPattern;
                
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
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';
    try {
        const { rows: personalInfoRows } = await db.query(`
            SELECT 
                CASE WHEN first_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(first_name_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as first_name,
                CASE WHEN last_name_encrypted IS NOT NULL THEN pgp_sym_decrypt(last_name_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as last_name,
                CASE WHEN email_encrypted IS NOT NULL THEN pgp_sym_decrypt(email_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as email,
                CASE WHEN birth_date_encrypted IS NOT NULL THEN SUBSTRING(pgp_sym_decrypt(birth_date_encrypted, '${ENCRYPTION_KEY}'), 1, 10) ELSE NULL END as birth_date,
                birth_time,
                CASE WHEN birth_country_encrypted IS NOT NULL THEN pgp_sym_decrypt(birth_country_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as birth_country,
                CASE WHEN birth_province_encrypted IS NOT NULL THEN pgp_sym_decrypt(birth_province_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as birth_province,
                CASE WHEN birth_city_encrypted IS NOT NULL THEN pgp_sym_decrypt(birth_city_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as birth_city,
                CASE WHEN birth_timezone_encrypted IS NOT NULL THEN pgp_sym_decrypt(birth_timezone_encrypted, '${ENCRYPTION_KEY}') ELSE NULL END as birth_timezone,
                sex,
                address_preference 
            FROM user_personal_info 
            WHERE user_id = $1
        `,
            [userId]
        );
                if (personalInfoRows.length > 0) {
            userInfo = personalInfoRows[0];
            // Use address preference if available, otherwise use first name
            userGreeting = userInfo.address_preference || userInfo.first_name || userId;
        }
    } catch (err) {
        console.error('Error fetching personal info:', err);
        // Continue with just userId if personal info fetch fails
    }
    
        // Calculate rising and moon signs if complete birth data available
    if (userInfo.birth_date && userInfo.birth_time && userInfo.birth_country && userInfo.birth_province && userInfo.birth_city) {
        try {
            const calculatedChart = await calculateBirthChartAsync({
                birth_date: userInfo.birth_date,
                birth_time: userInfo.birth_time,
                birth_country: userInfo.birth_country,
                birth_province: userInfo.birth_province,
                birth_city: userInfo.birth_city,
                birth_timezone: userInfo.birth_timezone
            });
            
            if (calculatedChart.success && calculatedChart.rising_sign && calculatedChart.moon_sign) {
                
                // Store calculated astrology data
                astrologyInfo.astrology_data = {
                    rising_sign: calculatedChart.rising_sign,
                    rising_degree: calculatedChart.rising_degree,
                    moon_sign: calculatedChart.moon_sign,
                    moon_degree: calculatedChart.moon_degree,
                    sun_sign: calculatedChart.sun_sign,
                    sun_degree: calculatedChart.sun_degree,
                    latitude: calculatedChart.latitude,
                    longitude: calculatedChart.longitude,
                    timezone: calculatedChart.timezone,
                    calculated_at: new Date().toISOString()
                };
                
                                // Store in database
                await db.query(
                    `INSERT INTO user_astrology (user_id, zodiac_sign, astrology_data)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (user_id) DO UPDATE SET
                     astrology_data = EXCLUDED.astrology_data,
                     updated_at = CURRENT_TIMESTAMP`,
                    [userId, calculatedChart.sun_sign, JSON.stringify(astrologyInfo.astrology_data)]
                );
            } else if (calculatedChart.error) {
                console.warn(`[WORKER] ⚠ Astrology calculation skipped: ${calculatedChart.error}`);
            }
        } catch (err) {
            console.error('[WORKER] Error calculating astrology:', err.message);
            // Continue without astrology data
        }
    }
    
    // Fetch user's astrology information (may have been updated above)
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
        
        // Handle both old format (sun sign data with name, dates, etc.) and new format (calculated data)
        let astrologyLines = [];
        
        if (astro.sun_sign) {
            // New format: calculated astrology data
            astrologyLines.push(`- Sun Sign (Core Identity): ${astro.sun_sign} (${astro.sun_degree}°)`);
            astrologyLines.push(`- Rising Sign (Ascendant): ${astro.rising_sign} (${astro.rising_degree}°)`);
            astrologyLines.push(`- Moon Sign (Emotional Nature): ${astro.moon_sign} (${astro.moon_degree}°)`);
            astrologyLines.push(`- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}`);
            astrologyLines.push(`- Birth Timezone: ${astro.timezone}`);
            astrologyLines.push(`- Coordinates: ${astro.latitude}°N, ${astro.longitude}°W`);
            astrologyLines.push(`- Calculated: ${astro.calculated_at || 'Swiss Ephemeris'}`);
        } else if (astro.name) {
            // Old format: zodiac sign data from database
            astrologyLines.push(`- Sun Sign (Core Identity): ${astrologyInfo.zodiac_sign} (${astro.name || ''})`);
            astrologyLines.push(`- Dates: ${astro.dates || ''}`);
            astrologyLines.push(`- Element: ${astro.element || ''}`);
            astrologyLines.push(`- Ruling Planet: ${astro.rulingPlanet || astro.planet || ''}`);
            astrologyLines.push(`- Symbol: ${astro.symbol || ''}`);
            if (astro.personality) astrologyLines.push(`- Personality Essence: ${astro.personality}`);
            if (astro.strengths) astrologyLines.push(`- Strengths: ${Array.isArray(astro.strengths) ? astro.strengths.join(', ') : ''}`);
            if (astro.weaknesses) astrologyLines.push(`- Challenges: ${Array.isArray(astro.weaknesses) ? astro.weaknesses.join(', ') : ''}`);
            if (astro.lifePath) astrologyLines.push(`- Life Path: ${astro.lifePath}`);
            if (astro.luckyElements?.stones) astrologyLines.push(`- Crystal Recommendations: ${astro.luckyElements.stones.join(', ')}`);
            if (astro.luckyElements?.days) astrologyLines.push(`- Lucky Days: ${astro.luckyElements.days.join(', ')}`);
            if (astro.luckyElements?.colors) astrologyLines.push(`- Lucky Colors: ${astro.luckyElements.colors.join(', ')}`);
        }
        
        astrologyContext = `
ASTROLOGICAL PROFILE:
${astrologyLines.join('\n')}

IMPORTANT: These astrological calculations are based on Swiss Ephemeris using the user's precise birth data.
Use these placements naturally in your guidance to create personalized, cosmic insights.
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
                content: `${combinedContext}

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

ASTROLOGICAL ACCURACY NOTE:
The user's rising sign and moon sign have been calculated using Swiss Ephemeris, which uses precise astronomical algorithms. These calculations are accurate based on the birth date, time, and location provided. You have access to these calculated values and should reference them naturally in your guidance. The rising sign describes how the user is perceived by others and their outward presentation, while the moon sign reflects their inner emotional nature and private self.
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
