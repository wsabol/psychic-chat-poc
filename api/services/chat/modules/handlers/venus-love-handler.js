/**
 * Venus Love Profile Handler
 *
 * Generates a rich, personalised romantic profile from the user's Venus sign,
 * Mars sign, Moon sign, and the current Venus/Mars transit aspects to their
 * natal chart.  Covers:
 *   - Romantic style & how they love
 *   - Love languages (giving & receiving)
 *   - Ideal partner qualities & what signs / traits to seek
 *   - How to IDENTIFY a potential lover in real life (green-flag behaviours)
 *   - Current Venus transit energy ("love weather" today)
 *   - Growth areas / relationship patterns to watch
 *
 * This is a persistent insight (not daily) — once generated it persists
 * until the user's birth chart changes or they manually refresh.
 */

import { db } from '../../../../shared/db.js';
import { hashUserId } from '../../../../shared/hashUtils.js';
import {
    fetchUserPersonalInfo,
    fetchUserAstrology,
    fetchUserOracleLanguagePreference,
    getOracleSystemPrompt,
    callOracle,
    getUserGreeting
} from '../oracle.js';
import { storeMessage } from '../messages.js';
import {
    getUserTimezone,
    getLocalTimestampForTimezone,
    getLocalDateForTimezone
} from '../utils/timezoneHelper.js';
import { getAstronomicalContext } from '../utils/astronomicalContext.js';
import {
    calculateTransitToNatalAspects,
    calculateNatalAspects,
    formatAspectsForPrompt
} from '../utils/aspectCalculator.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

/**
 * Generate (or return cached) Venus Love Profile for the user.
 * Re-generates daily so the "current love weather" section stays fresh.
 */
export async function generateVenusLoveProfile(userId) {
    try {
        const userIdHash = hashUserId(userId);

        // Fetch user's timezone & today's local date
        const userTimezone = await getUserTimezone(userIdHash);
        const todayLocalDate = getLocalDateForTimezone(userTimezone);

        // ── Check for existing profile (generated today) ──────────────────────
        const { rows: existing } = await db.query(
            `SELECT id, created_at_local_date
               FROM messages
              WHERE user_id_hash = $1 AND role = 'venus_love_profile'
              ORDER BY created_at DESC
              LIMIT 1`,
            [userIdHash]
        );

        if (existing.length > 0) {
            let rowDate = existing[0].created_at_local_date;
            if (rowDate instanceof Date) rowDate = rowDate.toISOString().split('T')[0];
            else if (typeof rowDate === 'string') rowDate = rowDate.split('T')[0];

            if (rowDate === todayLocalDate) {
                // Already generated for today — skip
                return;
            }
        }

        // ── Fetch user context ─────────────────────────────────────────────────
        const [userInfo, astrologyInfo, oracleLanguage] = await Promise.all([
            fetchUserPersonalInfo(userId),
            fetchUserAstrology(userId),
            fetchUserOracleLanguagePreference(userId)
        ]);

        if (!userInfo) {
            throw new Error('Please complete your personal information before generating your Venus Love Profile');
        }
        if (!astrologyInfo?.astrology_data) {
            throw new Error('Please complete your birth chart information before generating your Venus Love Profile');
        }

        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);

        // ── Current astronomical context ──────────────────────────────────────
        const astronomicalContext = await getAstronomicalContext();
        if (!astronomicalContext.success) {
            throw new Error('Failed to calculate astronomical context for Venus Love Profile');
        }
        const planets = astronomicalContext.currentPlanets;

        // ── Aspect calculations ───────────────────────────────────────────────
        const transitToNatalAspects = calculateTransitToNatalAspects(astro, planets);
        const natalAspects = calculateNatalAspects(astro);

        // Filter to Venus & Mars transits for the love-focus sections
        const venusTransits = transitToNatalAspects.filter(a =>
            a.transitPlanet === 'Venus' || a.transitPlanet === 'Mars'
        );

        const aspectsPromptSection = formatAspectsForPrompt(venusTransits, natalAspects);

        // ── System prompt ─────────────────────────────────────────────────────
        const systemPrompt = getOracleSystemPrompt(false, oracleLanguage) + `

SPECIAL REQUEST — VENUS LOVE PROFILE:
You are a masterful romantic astrologer. Generate a rich, deeply personal Venus Love Profile for ${userGreeting}.
This is NOT a daily horoscope — it is a permanent portrait of how this person loves, what they need, and what kind of partner calls to their soul.

REQUIRED SECTIONS (flow naturally, no headings — write as connected paragraphs):

1. ROMANTIC IDENTITY — How they love, how they attract, what makes them irresistible
   Use their Venus sign, degree, and any natal aspects involving Venus

2. LOVE LANGUAGES — What they give freely, what they need to feel truly cherished
   Tie directly to Venus sign energy (e.g. Venus in Taurus = physical touch + quality time)

3. YOUR IDEAL PARTNER — Describe the soul made to complement them
   - Which signs, rising signs, or moon signs tend to resonate
   - What QUALITIES and VALUES to look for (not just sun signs)
   - The non-negotiables vs. the nice-to-haves

4. HOW TO IDENTIFY A POTENTIAL LOVER — This is key!
   Give concrete, real-world guidance:
   - What behaviours, mannerisms, or conversation styles signal compatibility
   - The early signals that someone has the qualities they need
   - Red flags that look like green flags for this Venus placement
   - How a compatible person will make them feel vs. how chemistry-but-wrong feels
   - Specific situations or settings where they are most likely to meet their match

5. CURRENT LOVE WEATHER — How today's Venus & Mars transits are activating their chart
   Use the aspect data provided below. Reference specific aspects by name.

6. GROWTH IN LOVE — One or two honest patterns this Venus placement tends to repeat,
   and a gentle, empowering reframe for their next relationship chapter

CRITICAL OUTPUT FORMAT:
Write in PLAIN TEXT only — no HTML, no Markdown, no bullet points.
Use double line breaks (\\n\\n) between paragraphs.
Be poetic, warm, and deeply personal. Speak directly to ${userGreeting}.
Minimum 5 rich paragraphs.
`;

        // ── User prompt ───────────────────────────────────────────────────────
        const prompt = buildVenusLovePrompt(userInfo, astro, astronomicalContext, aspectsPromptSection, userGreeting);

        // ── Call Oracle ───────────────────────────────────────────────────────
        const oracleResponses = await callOracle(systemPrompt, [], prompt, true);

        // ── Compose stored data ───────────────────────────────────────────────
        const generatedAt = getLocalTimestampForTimezone(userTimezone);

        const fullData = {
            text: oracleResponses.full,
            venus_sign:   astro.venus_sign   || null,
            venus_degree: astro.venus_degree || null,
            mars_sign:    astro.mars_sign    || null,
            mars_degree:  astro.mars_degree  || null,
            moon_sign:    astro.moon_sign    || null,
            moon_degree:  astro.moon_degree  || null,
            rising_sign:  astro.rising_sign  || null,
            aspects: {
                venusMarisTransits: venusTransits,
                natal: natalAspects
            },
            generated_at: generatedAt
        };

        const briefData = {
            text: oracleResponses.brief,
            generated_at: generatedAt
        };

        await storeMessage(
            userId,
            'venus_love_profile',
            fullData,
            briefData,
            null, null, null,
            null, null, null,
            todayLocalDate,
            generatedAt
        );

    } catch (err) {
        logErrorFromCatch(err, '[VENUS-LOVE-HANDLER] Venus love profile generation failed');
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the user-facing prompt for the Oracle
 */
function buildVenusLovePrompt(userInfo, astro, astronomicalContext, aspectsPromptSection, userGreeting) {
    let prompt = `Generate a Venus Love Profile for ${userGreeting}:\n\n`;

    prompt += `NATAL CHART (love-relevant placements):\n`;
    prompt += `- Sun Sign:    ${astro.sun_sign    || 'Unknown'} (${astro.sun_degree    || 0}°)\n`;
    prompt += `- Moon Sign:   ${astro.moon_sign   || 'Unknown'} (${astro.moon_degree   || 0}°) — emotional needs in love\n`;
    prompt += `- Rising Sign: ${astro.rising_sign || 'Unknown'} (${astro.rising_degree || 0}°) — first impressions, first attraction\n`;
    if (astro.venus_sign) {
        prompt += `- Venus Sign:  ${astro.venus_sign} (${astro.venus_degree || 0}°) — love style, attraction, what they value\n`;
    }
    if (astro.mars_sign) {
        prompt += `- Mars Sign:   ${astro.mars_sign} (${astro.mars_degree || 0}°) — desire, pursuit, physical attraction\n`;
    }
    if (astro.mercury_sign) {
        prompt += `- Mercury Sign: ${astro.mercury_sign} (${astro.mercury_degree || 0}°) — how they communicate in relationships\n`;
    }
    if (userInfo?.birth_city) {
        prompt += `- Birth Location: ${[userInfo.birth_city, userInfo.birth_province, userInfo.birth_country].filter(Boolean).join(', ')}\n`;
    }

    prompt += `\nCURRENT LOVE WEATHER:\n`;
    prompt += `Moon Phase: ${astronomicalContext.currentMoonPhase}\n`;
    if (astronomicalContext.moonPosition) {
        prompt += `Moon in: ${astronomicalContext.moonPosition.degree}° ${astronomicalContext.moonPosition.sign}\n`;
    }

    // Find current Venus and Mars transit positions
    const venusPlanet = (astronomicalContext.currentPlanets || []).find(p => p.name === 'Venus');
    const marsPlanet  = (astronomicalContext.currentPlanets || []).find(p => p.name === 'Mars');
    if (venusPlanet) prompt += `Transit Venus: ${venusPlanet.degree}° ${venusPlanet.sign}${venusPlanet.retrograde ? ' Rx' : ''}\n`;
    if (marsPlanet)  prompt += `Transit Mars:  ${marsPlanet.degree}° ${marsPlanet.sign}${marsPlanet.retrograde ? ' Rx' : ''}\n`;

    if (aspectsPromptSection) {
        prompt += `\n${aspectsPromptSection}\n`;
    }

    prompt += `\nINTERPRETATION GUIDANCE:\n`;
    prompt += `- Weave Venus + Mars + Moon + Rising into a coherent portrait of how this person loves\n`;
    prompt += `- Be specific about partner compatibility — go beyond "look for a Libra" and describe QUALITIES\n`;
    prompt += `- The "How to identify a potential lover" section is the most important for the user — make it practical and actionable\n`;
    prompt += `- Reference today's Venus and Mars transits for the current love weather section\n`;
    prompt += `- End with empowering, compassionate growth guidance — not warnings\n`;

    return prompt;
}
