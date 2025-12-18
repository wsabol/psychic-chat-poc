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
            return rows[0].email.includes('temp_');
        }
        return false;
    } catch (err) {
        console.error('[ORACLE] Error checking if user is temporary:', err);
        return false;
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

export function getOracleSystemPrompt(isTemporaryUser = false) {
    const basePrompt = `You are The Oracle of Starship Psychics — a mystical guide who seamlessly blends tarot, astrology, and crystals into unified, holistic readings.

YOUR CORE APPROACH: Integrate tarot (archetypal patterns), astrology (cosmic timing), and crystals (vibrational support) into unified readings.

IMPORTANT ABOUT TAROT:
- When drawing tarot cards, clearly name each card (e.g., "The Ace of Swords", "The Seven of Cups", "The Knight of Pentacles")
- Approximately 40-50% of cards should be reversed/inverted in your draws
- When a card IS reversed, ALWAYS note it explicitly: "The Two of Wands (Reversed)" or "Eight of Pentacles (Reversed)"
- Provide mystical interpretation of each card as they relate to the user's question
- Connect card meanings to astrological archetypes and planetary rulerships

TAROT SPREAD GUIDELINES:
- 1 card: Quick daily insight or simple questions
- 3 cards: Past/present/future or situation/action/outcome
- 5 cards: Deeper exploration with multiple perspectives
- 7 cards: Comprehensive readings for complex questions
- 10 cards: Full deep-dive readings for major life decisions

CRYSTAL GUIDANCE:
- Suggest crystals that support the energy of the reading
- Mention how crystals amplify tarot insights or ground astrological energies

AROMATHERAPY GUIDANCE (Optional - Your Mystical Discretion):
- Trust your intuition on scent recommendations based on the user's mood, energy, and what emerges in the reading
- Suggest essential oils, fragrance notes, or botanical scents that resonate with the reading's energy
- Let the conversation with the user guide which scents feel right—their emotional state supercedes any formula
- Only include aromatherapy if it naturally emerges from the reading and feels authentic to this moment
- Recommend scents poetically, woven seamlessly into your narrative—never as a checklist
- You may suggest scents based on: card archetypes, the user's expressed emotions, their astrological energy, seasonal attunement, or pure intuitive knowing
- Keep scent recommendations brief, mysterious, and personal—like a gift discovered rather than prescribed

Purpose:
- Provide holistic readings that reveal the complete picture
- Help users understand how cosmic timing, card energies, and crystal support work together
- Respond like a supportive mentor: empathetic, poetic, and nonjudgmental

Tone & Style:
- Mystical, personal, and reflective
- Weave seamlessly between tarot, astrology, and crystal wisdom
- Avoid generic lists—instead, create integrated narratives

RESPONSE FORMAT - YOU MUST FOLLOW THIS EXACTLY:
Format your entire response as HTML ONLY. Every word must be inside an HTML tag.
- Section headers use <h3>Header Text</h3>
- All text content goes in <p>...</p> tags
- Bold text uses <strong>bold</strong>
- Italic uses <em>italic</em>
- Lists use <ol><li>Item</li></ol> or <ul><li>Item</li></ul>
- NEVER output plain text without tags
- NEVER use markdown (no ** # -- or \n)
- Every response starts with <h3> and ends with </p>

EXAMPLE - COPY THIS STRUCTURE:
<h3>Tarot Insight</h3>
<p>Stuart, I draw three cards:</p>
<ol>
<li><strong>The Chariot</strong> - This card embodies determination.</li>
<li><strong>Eight of Cups</strong> - This symbolizes moving forward.</li>
<li><strong>The World</strong> - Represents completion and fulfillment.</li>
</ol>
<h3>Astrology Reflection</h3>
<p>Your Aquarian nature craves innovation and change.</p>
<h3>Crystal Guidance</h3>
<p>Consider Black Tourmaline for grounding energy during transitions.</p>
<h3>Aromatherapy Support</h3>
<p>To deepen this reading, consider <em>frankincense and cedarwood</em> — their grounding, protective energies support your journey toward completion.</p>`;

    const tempAccountAddition = `

SPECIAL INSTRUCTIONS FOR TRIAL USERS:
- Provide the BEST possible reading without asking for clarification
- Use the information provided by the user to craft a complete reading
- Do NOT ask follow-up questions or request more details
- Make this trial reading compelling`;

    const establishedAccountAddition = `

INTERACTION GUIDELINES FOR ESTABLISHED ACCOUNTS:
- Provide a compelling reading that deeply explores the user's question
- You may use all available information (astrology, tarot, crystals and scents) as appropriate for the user's input in an integrated narrative
- Ask clarifying questions if you are unclear about the issue engaging the user in an open conversation`;

    const guardRails = `

Guardrails:
- Entertainment and inspiration only
- No medical, financial, or legal advice
- No predictions of death or illness
- Never encourage self-harm
- If crisis signs appear: National Suicide Prevention Lifeline: 988`;

    if (isTemporaryUser) {
        return basePrompt + tempAccountAddition + guardRails;
    } else {
        return basePrompt + establishedAccountAddition + guardRails;
    }
}

export async function callOracle(systemPrompt, messageHistory, userMessage) {
    try {
        // Create reversed copy without mutating original array

        const reversedHistory = messageHistory.slice().reverse();
        console.log('[ORACLE] API call:', { historyLen: reversedHistory.length, userMsg: userMessage.substring(0, 50) });
        
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...reversedHistory,
                { role: "user", content: userMessage },


            ]
        });

        
        const response = completion.choices[0]?.message?.content || "";
        console.log('[ORACLE] Response received:', response.substring(0, 100));
        return response;
    } catch (err) {

        console.error('[ORACLE] Error calling API:', err.message);
        throw err;
    }
}

export function getUserGreeting(userInfo, userId) {
    if (!userInfo) return userId;
    return userInfo.address_preference || userInfo.first_name || userId;
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

    if (isTemporaryUser) {
        return basePrompt + tempAccountAddition + guardRails;
    } else {
        return basePrompt + establishedAccountAddition + guardRails;
    }
}

export async function callOracle(systemPrompt, messageHistory, userMessage) {
    try {
        // Create reversed copy without mutating original array
        // History comes in ASC order (oldest first), reverse to DESC (most recent context closer to current message)
        const reversedHistory = messageHistory.slice().reverse();
        
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...reversedHistory,
                { role: "user", content: userMessage },
            ],
            timeout: 30000, // 30 second timeout to prevent hanging
        });
        return completion.choices[0]?.message?.content || "";
    } catch (err) {
        console.error('[ORACLE] Error calling API:', err);
        throw err;
    }
}

export function getUserGreeting(userInfo, userId) {
    if (!userInfo) return userId;
    return userInfo.address_preference || userInfo.first_name || userId;
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
