import { fetchUserAstrology, fetchUserLanguagePreference, fetchUserOracleLanguagePreference, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { getUserTimezone, getLocalDateForTimezone, getLocalTimestampForTimezone, needsRegeneration } from '../utils/timezoneHelper.js';
import { db } from '../../../../shared/db.js';
import { hashUserId } from '../../../../shared/hashUtils.js';
import { getAstronomicalContext, formatPlanetsForPrompt } from '../utils/astronomicalContext.js';
import { calculateTransitToNatalAspects, calculateNatalAspects, formatAspectsForPrompt } from '../utils/aspectCalculator.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';



export async function generateCosmicWeather(userId) {
    try {
        const userIdHash = hashUserId(userId);
        
        // Get user's timezone and today's local date
        const userTimezone = await getUserTimezone(userIdHash);
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
                // Check if cosmic weather already exists for today (in user's timezone)
        const { rows: existingWeather } = await db.query(
            `SELECT id, created_at_local_date FROM messages WHERE user_id_hash = $1 AND role = 'cosmic_weather' ORDER BY created_at DESC LIMIT 1`,
            [userIdHash]
        );
        
        if (existingWeather.length > 0) {
            const createdAtLocalDate = existingWeather[0].created_at_local_date;
            // Convert to YYYY-MM-DD string if it's a Date object
            const createdDateStr = createdAtLocalDate instanceof Date 
                ? createdAtLocalDate.toISOString().split('T')[0]
                : String(createdAtLocalDate).split('T')[0];
            
            if (!needsRegeneration(createdDateStr, todayLocalDate)) {
                return;
            }
        }
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        const oracleLanguage = await fetchUserOracleLanguagePreference(userId);
        
        // Throw error if user hasn't completed astrology setup yet
        if (!userInfo) {
            throw new Error('Please complete your personal information before generating cosmic weather');
        }
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('Please complete your birth chart information before generating cosmic weather');
        }
        
        // Get current astronomical context (planets, moon phase, etc.)
        const astronomicalContext = await getAstronomicalContext();
        if (!astronomicalContext.success) {
            throw new Error('Failed to calculate astronomical context');
        }
        const planets = astronomicalContext.currentPlanets;
        
        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);
        
        // Build detailed planet information with calculated positions and degrees
        const planetsDetailed = formatPlanetsForPrompt(planets);

        // ── Aspect Calculations ──────────────────────────────────────────────
        // Calculate how today's sky aspects the user's natal chart + natal-to-natal aspects
        const transitToNatalAspects = calculateTransitToNatalAspects(astro, planets);
        const natalAspects = calculateNatalAspects(astro);
        const aspectsPromptSection = formatAspectsForPrompt(transitToNatalAspects, natalAspects);
        
        // Get oracle system prompt with ORACLE LANGUAGE SUPPORT
        // Oracle response uses oracleLanguage (can be regional variant), page UI uses userLanguage
        const systemPrompt = getOracleSystemPrompt(false, oracleLanguage) + `

SPECIAL REQUEST - COSMIC WEATHER WITH NATAL ASPECT ANALYSIS:
Generate today's cosmic weather for ${userGreeting} using their complete birth chart, current planetary alignments, and the calculated aspects below.
Do NOT keep it brief - provide meaningful depth (3-4 paragraphs minimum).
Reference their Sun sign (identity), Moon sign (emotions), and Rising sign (presentation).
Incorporate how today's planetary movements interact with their natal chart.
Include retrograde effects if any planets are retrograde.
Provide practical guidance for working with today's cosmic energies.
Include crystal or ritual recommendations aligned with their chart and today's planetary weather.
Focus on TODAY's cosmic energies with specific, personal insight.
Do NOT include tarot cards - this is pure astrological forecasting enriched by their unique birth chart.

NATAL ASPECT INTERPRETATION — CRITICAL REQUIREMENTS:
You MUST specifically interpret the calculated aspects provided below. For each active transit aspect:
- Name the planets involved and the exact aspect type (trine, square, conjunction, opposition, sextile, quincunx)
- Explain what this aspect activates in their life TODAY (relationships, career, creativity, communication, drive, emotions)
- Distinguish clearly between harmonious aspects (trine, sextile) which bring ease and opportunity, and challenging aspects (square, opposition) which create growth through tension
- For conjunctions, explain the powerful merging of those planetary energies in their chart
- Reference natal aspects to explain why certain transits resonate especially deeply for this person
- Use natural astrological language: "With transiting Jupiter trining your natal Sun...", "As Saturn forms a square to your natal Moon...", "The conjunction between transit Venus and your natal Rising..."
- Make each aspect interpretation personal and specific — not generic textbook meanings

CRITICAL OUTPUT FORMAT OVERRIDE FOR COSMIC WEATHER:
For cosmic weather responses ONLY, ignore the HTML formatting rules.
Output your response in PLAIN TEXT with natural paragraph breaks.
Use double line breaks (\\n\\n) between paragraphs for readability.
Do NOT use HTML tags like <h3>, <p>, <strong>, etc.
Do NOT use Markdown formatting like ** or # either.
Write naturally and conversationally as plain text.
Begin directly with your cosmic weather insight and flow naturally through your guidance.
`;
        
        const prompt = buildCosmicWeatherPrompt(userInfo, astrologyInfo, astronomicalContext, planetsDetailed, aspectsPromptSection, userGreeting);
        
                // Call Oracle - response is already in user's preferred language
        const oracleResponses = await callOracle(systemPrompt, [], prompt, true);
        
        // CRITICAL FIX: Use user's local timezone for generated_at timestamp
        const generatedAt = getLocalTimestampForTimezone(userTimezone);
        
        const cosmicWeatherDataFull = {
            text: oracleResponses.full,
            birth_chart: {
                sun_sign: astro.sun_sign,
                sun_degree: astro.sun_degree,
                moon_sign: astro.moon_sign,
                moon_degree: astro.moon_degree,
                rising_sign: astro.rising_sign,
                rising_degree: astro.rising_degree,
                venus_sign: astro.venus_sign,
                venus_degree: astro.venus_degree,
                mars_sign: astro.mars_sign,
                mars_degree: astro.mars_degree,
                mercury_sign: astro.mercury_sign,
                mercury_degree: astro.mercury_degree
            },
            planets: planets,
            aspects: {
                transitToNatal: transitToNatalAspects,
                natal: natalAspects
            },
            generated_at: generatedAt
        };
        
        const cosmicWeatherDataBrief = {
            text: oracleResponses.brief,
            generated_at: generatedAt
        };
        
                                // Store message (no translation needed - response is already in user's language)
        const storeResult = await storeMessage(
            userId, 
            'cosmic_weather', 
            cosmicWeatherDataFull, 
            cosmicWeatherDataBrief,
            null,  // no languageCode needed
            null,  // no contentFullLang needed
            null,  // no contentBriefLang needed
            null,
            null,
            null,
            todayLocalDate,
            generatedAt  // createdAtLocalTimestamp - use local timezone timestamp
        );
        
        // SSE notifications removed - synchronous processing like chat
        // No Redis required for immediate response
        
                        } catch (err) {
        logErrorFromCatch(err, '[CW-HANDLER] Cosmic weather generation failed');
        throw err;
    }
}

/**
 * Build comprehensive cosmic weather prompt - includes natal aspect analysis
 * @param {Object} userInfo
 * @param {Object} astrologyInfo
 * @param {Object} astronomicalContext
 * @param {string} planetsDetailed    - formatted planet positions string
 * @param {string} aspectsPromptSection - calculated aspects from aspectCalculator
 * @param {string} userGreeting
 */
function buildCosmicWeatherPrompt(userInfo, astrologyInfo, astronomicalContext, planetsDetailed, aspectsPromptSection, userGreeting) {
    const astro = astrologyInfo.astrology_data;
    
    let prompt = `Generate today's comprehensive cosmic weather with natal aspect analysis for ${userGreeting}:\n\n`;
    
    prompt += `COMPLETE BIRTH CHART:\n`;
    prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity, Life Purpose, Vital Force\n`;
    prompt += `- Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Inner Emotional World, Needs, Subconscious\n`;
    prompt += `- Rising Sign/Ascendant: ${astro.rising_sign} (${astro.rising_degree}°) - How they appear to the world, Personal Magnetism\n`;
    if (astro.venus_sign) prompt += `- Venus Sign: ${astro.venus_sign} (${astro.venus_degree}°) - Love, Values, Attraction, Pleasure\n`;
    if (astro.mars_sign) prompt += `- Mars Sign: ${astro.mars_sign} (${astro.mars_degree}°) - Action, Drive, Passion, Assertion\n`;
    if (astro.mercury_sign) prompt += `- Mercury Sign: ${astro.mercury_sign} (${astro.mercury_degree}°) - Communication, Thinking Style, Mental Processing\n`;
    prompt += `- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}\n\n`;
    
    prompt += `TODAY'S CALCULATED ASTRONOMICAL POSITIONS:\n`;
    prompt += `Moon Phase: ${astronomicalContext.currentMoonPhase}\n`;
    if (astronomicalContext.moonPosition) {
        prompt += `Current Moon: ${astronomicalContext.moonPosition.degree}° ${astronomicalContext.moonPosition.sign}\n`;
    }
    prompt += `\nPlanetary Positions:\n`;
    prompt += planetsDetailed + '\n\n';

    // ── Inject calculated aspects ─────────────────────────────────────────────
    if (aspectsPromptSection) {
        prompt += aspectsPromptSection + '\n';
    }
    
    prompt += `ORACLE INTERPRETATION INSTRUCTIONS:\n`;
    prompt += `You are a mystical oracle weaving together today's specific planetary positions AND their calculated aspects to this person's natal chart.\n`;
    prompt += `Each day is completely unique — use the aspects above as your primary interpretive framework:\n`;
    prompt += `- Lead with the most significant transit-to-natal aspects (tightest orb = strongest effect)\n`;
    prompt += `- For each active aspect, explain: which planet energies are interacting, what type of aspect it is, and what this activates in their life TODAY\n`;
    prompt += `- Trines and sextiles: describe the ease, flow, and opportunity available\n`;
    prompt += `- Squares and oppositions: describe the tension, challenge, and growth potential — frame constructively\n`;
    prompt += `- Conjunctions: describe the powerful merging of those two planetary energies in their chart\n`;
    prompt += `- Reference natal aspects to explain why certain transits resonate more deeply for them personally\n`;
    prompt += `- Identify which life areas (relationships, career, health, creativity, spirituality) are most activated today\n`;
    prompt += `- Explain retrograde influences if applicable\n`;
    prompt += `- Provide 3-4 paragraphs of rich, personalized insight unique to TODAY's cosmic moment\n`;
    prompt += `- Address them directly by name and make this deeply personal\n`;
    prompt += `- Include practical guidance for working with today's energies\n`;
    prompt += `- Suggest crystals or practices that align with their chart and today's specific planetary weather\n`;
    prompt += `- Be poetic, mystical, and reveal deep astrological knowledge through interpretation\n`;
    prompt += `- Each day's reading must feel completely different because the aspects and positions change daily`;
    
    return prompt;
}

export function isCosmicWeatherRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('cosmic weather');
}
