import { fetchUserAstrology, fetchUserLanguagePreference, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { getUserTimezone, getLocalDateForTimezone, needsRegeneration } from '../utils/timezoneHelper.js';
import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { spawn } from 'child_process';

function getCosmicWeatherPlanets() {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', ['/app/astrology.py']);
        let output = '';
        python.stdin.write(JSON.stringify({ type: 'current_planets' }));
        python.stdin.end();
        python.stdout.on('data', (data) => { output += data.toString(); });
        python.stderr.on('data', (data) => console.error('[PYTHON]', data.toString()));
        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python exited with code ${code}`));
                return;
            }
            try {
                resolve(JSON.parse(output));
            } catch (err) {
                reject(err);
            }
        });
    });
}

export async function generateCosmicWeather(userId) {
    try {
        const userIdHash = hashUserId(userId);
        
        // Get user's timezone and today's local date
        const userTimezone = await getUserTimezone(userIdHash);
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
        // Check if cosmic weather already exists for today (in user's timezone)
        const { rows } = await db.query(
            `SELECT id, created_at_local_date FROM messages WHERE user_id_hash = $1 AND role = 'cosmic_weather' ORDER BY created_at DESC LIMIT 1`,
            [userIdHash]
        );
        
        if (rows.length > 0) {
            const createdAtLocalDate = rows[0].created_at_local_date;
            if (!needsRegeneration(createdAtLocalDate, todayLocalDate)) {
                return;
            } else {
            }
        } else {
        }
        
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('No astrology data found');
        }
        
        // Get planets with retrograde status and calculated degrees
        const planetsData = await getCosmicWeatherPlanets();
        if (!planetsData.success) {
            throw new Error('Failed to calculate planets');
        }
        const planets = planetsData.planets;
        
        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);
        
        // Build detailed planet information with calculated positions and degrees
        const planetsDetailed = planets
            .map(p => `- ${p.icon} ${p.name} at ${p.degree}° in ${p.sign}${p.retrograde ? ' ♻️ RETROGRADE' : ''}`)
            .join('\n');
        
        // Get oracle system prompt with LANGUAGE SUPPORT
        const systemPrompt = getOracleSystemPrompt(false, userLanguage) + `

SPECIAL REQUEST - COSMIC WEATHER:
Generate today's cosmic weather for ${userGreeting} using their complete birth chart and current planetary alignments.
Do NOT keep it brief - provide meaningful depth (3-4 paragraphs minimum).
Reference their Sun sign (identity), Moon sign (emotions), and Rising sign (presentation).
Incorporate how today's planetary movements interact with their natal chart.
Include retrograde effects if any planets are retrograde.
Provide practical guidance for working with today's cosmic energies.
Include crystal or ritual recommendations aligned with their chart and today's planetary weather.
Focus on TODAY's cosmic energies with specific, personal insight.
Do NOT include tarot cards - this is pure astrological forecasting enriched by their unique birth chart.
`;
        
        const prompt = buildCosmicWeatherPrompt(userInfo, astrologyInfo, planets, planetsDetailed, userGreeting);
        
        // Call Oracle - response is already in user's preferred language
        const oracleResponses = await callOracle(systemPrompt, [], prompt, true);
        
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
            generated_at: new Date().toISOString()
        };
        
        const cosmicWeatherDataBrief = {
            text: oracleResponses.brief,
            generated_at: new Date().toISOString()
        };
        
        // Store message (no translation needed - response is already in user's language)
        await storeMessage(
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
            todayLocalDate
        );
        
    } catch (err) {
        console.error('[COSMIC-WEATHER-HANDLER] Error:', err.message);
        console.error('[COSMIC-WEATHER-HANDLER] Stack:', err.stack);
        throw err;
    }
}

/**
 * Build comprehensive cosmic weather prompt - let oracle interpret calculated positions
 */
function buildCosmicWeatherPrompt(userInfo, astrologyInfo, planets, planetsDetailed, userGreeting) {
    const astro = astrologyInfo.astrology_data;
    
    let prompt = `Generate today's comprehensive cosmic weather for ${userGreeting}:\n\n`;
    
    prompt += `COMPLETE BIRTH CHART:\n`;
    prompt += `- Sun Sign: ${astro.sun_sign} (${astro.sun_degree}°) - Core Identity, Life Purpose, Vital Force\n`;
    prompt += `- Moon Sign: ${astro.moon_sign} (${astro.moon_degree}°) - Inner Emotional World, Needs, Subconscious\n`;
    prompt += `- Rising Sign/Ascendant: ${astro.rising_sign} (${astro.rising_degree}°) - How they appear to the world, Personal Magnetism\n`;
    if (astro.venus_sign) prompt += `- Venus Sign: ${astro.venus_sign} (${astro.venus_degree}°) - Love, Values, Attraction, Pleasure\n`;
    if (astro.mars_sign) prompt += `- Mars Sign: ${astro.mars_sign} (${astro.mars_degree}°) - Action, Drive, Passion, Assertion\n`;
    if (astro.mercury_sign) prompt += `- Mercury Sign: ${astro.mercury_sign} (${astro.mercury_degree}°) - Communication, Thinking Style, Mental Processing\n`;
    prompt += `- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}\n\n`;
    
    prompt += `TODAY'S CALCULATED PLANETARY POSITIONS (use your astrological knowledge to interpret):\n`;
    prompt += planetsDetailed + '\n\n';
    
    prompt += `ORACLE INSTRUCTIONS:\n`;
    prompt += `You are a mystical oracle interpreting the unique cosmic weather created by today's specific planetary positions and degrees.\n`;
    prompt += `Each day is completely unique based on where the planets are positioned - use your deep astrological knowledge to interpret what THESE specific positions mean.\n`;
    prompt += `- Show how each planet's current position (degree in sign) interacts with their natal Sun, Moon, and Rising signs\n`;
    prompt += `- Identify which life areas (relationships, career, health, creativity, spirituality) are most activated by today's specific transits\n`;
    prompt += `- Explain retrograde influences if applicable and what they uniquely mean for this person's chart\n`;
    prompt += `- Provide 3-4 paragraphs of rich, personalized insight that could NOT be the same as any other day (due to different planetary positions)\n`;
    prompt += `- Address them directly by name and make this deeply personal and unique to TODAY's cosmic moment\n`;
    prompt += `- Include practical guidance for working harmoniously with today's energies\n`;
    prompt += `- Suggest crystals or practices that align with their chart and today's specific planetary weather\n`;
    prompt += `- Be poetic, mystical, and reveal your deep astrological knowledge through interpretation, not through pre-written meanings\n`;
    prompt += `- Show how today's transits either support or challenge their natal chart strengths\n`;
    prompt += `- Make specific references to their unique astrological signature and what today's planets mean for THEM specifically\n`;
    prompt += `- Remember: each day's reading must be unique to the specific planetary degrees and positions for that day`;
    
    return prompt;
}

export function isCosmicWeatherRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('cosmic weather');
}

