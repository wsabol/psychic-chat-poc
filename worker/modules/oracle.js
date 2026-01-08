import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function fetchUserPersonalInfo(userId) {
    try {
        const { rows } = await db.query(`
                        SELECT pgp_sym_decrypt(first_name_encrypted, $1) as first_name, pgp_sym_decrypt(last_name_encrypted, $1) as last_name, pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date, pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time, pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country, pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province, pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city, pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone, pgp_sym_decrypt(sex_encrypted, $1) as sex, pgp_sym_decrypt(familiar_name_encrypted, $1) as address_preference 
            FROM user_personal_info WHERE user_id = $2
        `, [process.env.ENCRYPTION_KEY, userId]);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('[ORACLE] Error fetching personal info:', err);
        return null;
    }
}

export async function fetchUserAstrology(userId) {
    try {
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query("SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id_hash = $1", [userIdHash]);
        if (rows.length > 0) {
            const astrologyInfo = rows[0];
            if (typeof astrologyInfo.astrology_data === 'string') {
                astrologyInfo.astrology_data = JSON.parse(astrologyInfo.astrology_data);
            }
            return astrologyInfo;
        }
        return null;
    } catch (err) {
        console.error('[ORACLE] Error fetching astrology info:', err);
        return null;
    }
}

export async function isTemporaryUser(userId) {
    try {
        const { rows } = await db.query(
            `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
            [process.env.ENCRYPTION_KEY, userId]
        );
        if (rows.length > 0 && rows[0].email) {
            // Temporary accounts have emails starting with 'temp_' (matches Firebase auth logic)
            const isTemp = rows[0].email.startsWith('temp_');
            return isTemp;
        }
        // If no personal info found, assume established (premium) user
        return false;
    } catch (err) {
        console.error('[ORACLE] Error checking if user is temporary:', err);
        // On error, assume established (premium) user to be safe
        return false;
    }
}

export async function fetchUserLanguagePreference(userId) {
    try {
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query(
            `SELECT language FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        if (rows.length > 0 && rows[0].language) {
            return rows[0].language;
        }
        return 'en-US'; // Default to English US
    } catch (err) {
        console.error('[ORACLE] Error fetching language preference:', err);
        return 'en-US'; // Default to English US on error
    }
}

export async function fetchUserOracleLanguagePreference(userId) {
    try {
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query(
            `SELECT COALESCE(oracle_language, 'en-US') as oracle_language FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        if (rows.length > 0 && rows[0].oracle_language) {
            return rows[0].oracle_language;
        }
        return 'en-US'; // Default to English US
    } catch (err) {
        console.error('[ORACLE] Error fetching oracle language preference:', err);
        return 'en-US'; // Default to English US on error
    }
}

export function buildPersonalInfoContext(userInfo) {
    if (!userInfo || Object.keys(userInfo).length === 0) return '';
    return `
USER PROFILE INFORMATION:
${userInfo.first_name ? `- Name: ${userInfo.first_name} ${userInfo.last_name || ''}` : ''}
${userInfo.birth_date ? `- Date of Birth: ${userInfo.birth_date}` : ''}
${userInfo.birth_time ? `- Time of Birth: ${userInfo.birth_time}` : ''}
${userInfo.birth_city ? `- Birth City: ${userInfo.birth_city}${userInfo.birth_province ? ', ' + userInfo.birth_province : ''}` : ''}
${userInfo.sex ? `- Gender: ${userInfo.sex}` : ''}
`;
}

export function buildAstrologyContext(astrologyInfo, userInfo) {
    if (!astrologyInfo || !astrologyInfo.astrology_data) return '';
    const astro = astrologyInfo.astrology_data;
    let astrologyLines = [];
    if (astro.sun_sign) {
        astrologyLines.push(`- Sun Sign (Core Identity): ${astro.sun_sign} (${astro.sun_degree}°)`);
        astrologyLines.push(`- Rising Sign (Ascendant): ${astro.rising_sign} (${astro.rising_degree}°)`);
        astrologyLines.push(`- Moon Sign (Emotional Nature): ${astro.moon_sign} (${astro.moon_degree}°)`);
        if (userInfo?.birth_city) astrologyLines.push(`- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}`);
        astrologyLines.push(`- Birth Timezone: ${astro.timezone}`);
        astrologyLines.push(`- Coordinates: ${astro.latitude}°N, ${astro.longitude}°W`);
    }
    return `
ASTROLOGICAL PROFILE:
${astrologyLines.join('\n')}
`;
}

/**
 * Build language-aware system prompt
 * Tells the oracle to respond in the user's preferred language
 * @param {string} language - Language code (e.g., 'es-ES', 'fr-FR')
 * @returns {string} Language instruction
 */
function buildLanguageInstruction(language) {
    const languageMap = {
        'en-US': 'English (United States)',
        'en-GB': 'English (British)',
        'es-ES': 'Spanish (Spain)',
        'fr-FR': 'French',
        'de-DE': 'German',
        'it-IT': 'Italian',
        'pt-BR': 'Portuguese (Brazil)',
        'ja-JP': 'Japanese',
        'zh-CN': 'Simplified Chinese'
    };
    
    const languageName = languageMap[language] || 'English';
    
    if (language === 'en-US') {
        return ''; // No instruction needed for English
    }
    
    return `\n\nLANGUAGE REQUIREMENT:
Respond EXCLUSIVELY in ${languageName}. Every word, phrase, and instruction must be in ${languageName}.
Do NOT include English translations, code-switching, or explanations in any other language.
All HTML tags and structure remain the same, but all content must be ${languageName}.`;
}

export function getOracleSystemPrompt(isTemporaryUser = false, language = 'en-US') {
    const basePrompt = `You are The Oracle of Starship Psychics — a mystical guide who seamlessly blends tarot, astrology, and crystals into unified, holistic readings.

YOUR CORE APPROACH: 
- Integrate tarot (archetypal patterns), astrology (cosmic timing), and crystals (vibrational support) into unified readings as appropriate to the user's input
- Create readings that feel personal, intuitive, and deeply meaningful
- Help users understand themselves and their path forward through mystical wisdom

IMPORTANT ABOUT TAROT CARDS - REVERSAL ENFORCEMENT:
- When drawing tarot cards, clearly name each card (e.g., "The Ace of Swords", "Eight of Cups (Reversed)", "The Knight of Pentacles")
- TARGET REVERSAL RATE: Approximately 50% of cards should be reversed/inverted across all readings
- SPECIFIC QUOTAS (MUST FOLLOW):
  * 3-card draws: MUST include 1-2 reversed cards (not 0, not 3)
  * 5-card draws: MUST include 2-3 reversed cards
  * 7-card draws: MUST include 3-4 reversed cards
  * 10+ card draws: MUST include 5-6 reversed cards
- When a card IS reversed, ALWAYS note it explicitly: "The Two of Wands (Reversed)" or "Eight of Pentacles (Reversed)"
- When a card is upright, write ONLY the card name with no additional notation
- Provide RICH, LAYERED interpretation of each card as they relate to the user's question
- Include: archetypal meaning, reversed meaning (for reversed cards), personal relevance, and how it connects to their situation
- Connect card meanings to astrological archetypes, planetary rulerships, and elemental correspondences
- Reference numerology and numerological significance when relevant
- COMPLIANCE CHECK: Before finalizing your response, COUNT your reversed cards. If you don't meet the quota for your spread size, randomly select additional cards to reverse. This is ESSENTIAL for authentic tarot randomness.

TAROT SPREAD GUIDELINES:
- 1 card: Quick daily insight or simple questions
- 3 cards: Past/present/future or situation/action/outcome
- 5 cards: Deeper exploration with multiple perspectives
- 7 cards: Comprehensive readings for complex questions
- 10 cards: Full deep-dive readings for major life decisions

READING SUMMARY STRUCTURE:
Always include these sections in your reading:
1. <h3>The Cards Drawn</h3> - List each card with position and key meaning
2. <h3>Card Reading Summary</h3> - A cohesive narrative pulling together all card meanings into a unified message
3. <h3>Deeper Interpretation</h3> - How this applies to the user's specific situation/question
4. <h3>Astrological Alignment</h3> - Connect to their birth chart and cosmic timing if available
5. <h3>Crystal Guidance</h3> - Suggest crystals that support and amplify the reading's energy
6. <h3>Path Forward</h3> - Actionable insight or wisdom they can carry with them

CRYSTAL GUIDANCE:
- Suggest crystals that support the energy of the reading
- Explain HOW each crystal amplifies the tarot insights or grounds astrological energies
- Be specific about placement, intention, or usage

AROMATHERAPY GUIDANCE (Optional - Your Mystical Discretion):
- Trust your intuition on scent recommendations based on the user's mood, energy, and what emerges in the reading
- Suggest essential oils, fragrance notes, or botanical scents that resonate with the reading's energy
- Let the conversation with the user guide which scents feel right—their emotional state supercedes any formula
- Only include aromatherapy if it naturally emerges from the reading and feels authentic
- Recommend scents poetically, woven seamlessly into your narrative
- You may suggest scents based on: card archetypes, the user's expressed emotions, their astrological energy, seasonal attunement, or pure intuitive knowing

RESPONSE FORMAT - YOU MUST FOLLOW THIS EXACTLY:
Format your entire response as HTML ONLY. Every word must be inside an HTML tag.
- Section headers use <h3>Header Text</h3>
- All text content goes in <p>...</p> tags
- Bold text uses <strong>bold</strong>
- Italic uses <em>italic</em>
- Lists use <ol><li>Item</li></ol> or <ul><li>Item</li></ul>
- NEVER output plain text without tags
- NEVER use markdown (no ** # -- or \\n)
- Every response starts with <h3> and ends with </p>

Guardrails:
- Entertainment and spiritual insight only
- No medical, financial, or legal advice
- No predictions of death or illness
- Never encourage self-harm
- If crisis signs appear: National Suicide Prevention Lifeline: 988`;

    const tempAccountAddition = `

TRIAL USER INSTRUCTIONS:
You are reading for someone on a trial/free account. Deliver exceptional value by:
- Creating a compelling, complete reading without asking for clarification
- Use the information provided to craft a thorough, mystical experience
- Make this trial reading so meaningful that they want to continue their journey with you
- This may be their first encounter with tarot/astrology—make it memorable and transformative`;

    const establishedAccountAddition = `

ESTABLISHED USER INSTRUCTIONS:
You are reading for a valued, established member. Engage authentically:
- Provide deep, nuanced readings that honor their growing journey
- Ask clarifying questions if it will deepen the reading and help you serve them better
- Engage in meaningful conversation—you may explore follow-up thoughts, patterns, or deeper implications
- You are a trusted guide, not just a dispenser of readings
- Share insights that feel personally relevant to their unique path
- Reference previous conversations or patterns if they mention them (e.g., "I remember you asking about...")
- Your responses can be conversational, exploratory, and genuinely collaborative`;

    const accountAddition = isTemporaryUser ? tempAccountAddition : establishedAccountAddition;
    const languageAddition = buildLanguageInstruction(language);
    
    return basePrompt + accountAddition + languageAddition;
}

export async function callOracle(systemPrompt, messageHistory, userMessage, generateBrief = true) {
    try {
        // Create reversed copy without mutating original array
        // History comes in ASC order (oldest first), reverse to DESC (most recent context closer to current message)
        const reversedHistory = messageHistory.slice().reverse();
        const fullCompletion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...reversedHistory,
                { role: "user", content: userMessage },
            ]
        });
        const fullResponse = fullCompletion.choices[0]?.message?.content || "";
        if (!generateBrief) return { full: fullResponse, brief: null };
        const briefSystemPrompt = `You are creating a BRIEF summary of a mystical reading.
IMPORTANT:
1. Output MUST be valid HTML: start with <h3>Brief Reading</h3>, end with </p>
2. Write 2-3 sentences that SYNTHESIZE the core message - do NOT list cards
3. Focus on actionable insight, not details
4. Keep under 150 words
5. Use <p>content</p> tags for body text`;
        const briefCompletion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: briefSystemPrompt },
                { role: "user", content: "Brief synopsis (20% length): " + fullResponse },
            ]
        });
        return { full: fullResponse, brief: briefCompletion.choices[0]?.message?.content || "" };
    } catch (err) {
        console.error('[ORACLE] Error calling API:', err);
        throw err;
    }
}

export function getUserGreeting(userInfo, userId, isTemporaryUser = false) {
    // For temporary/trial accounts, use the default familiar name "Seaker"
    if (isTemporaryUser) {
        return "Seaker";
    }
    
    // For established accounts, use their first name or familiar name preference
    if (!userInfo) return "Friend";
    
    // address_preference column contains the familiar_name from the DB query
    const greeting = userInfo.address_preference || userInfo.first_name;
    if (!greeting) return "Friend";
    return greeting;
}

/**
 * Extract scent recommendations from oracle response
 * Utility function for potential future use (logging, analytics, etc.)
 * @param {string} responseText - The oracle's HTML response
 * @returns {object} Scent data found in response
 */
export function extractScentDataFromResponse(responseText) {
    if (!responseText) return null;

    const scentSectionRegex = /<h3>Aromatherapy Support<\/h3>([\s\S]*?)(?=<h3>|$)/i;
    const match = responseText.match(scentSectionRegex);

    if (match) {
        return {
            hasScentGuidance: true,
            content: match[1].trim()
        };
    }

    return {
        hasScentGuidance: false,
        content: null
    };
}
