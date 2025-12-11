import { fetchUserAstrology, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { db } from '../../shared/db.js';
import { spawn } from 'child_process';

function getCosmicWeatherPlanets() {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', ['astrology_v2.py']);
        let output = '';
        python.stdin.write(JSON.stringify({ type: 'cosmic_weather_planets' }));
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
        const today = new Date().toISOString().split('T')[0];
        
        // Check if cosmic weather already exists for today
        const { rows } = await db.query(
            `SELECT content FROM messages WHERE user_id = $1 AND role = 'cosmic_weather' ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );
        
        if (rows.length > 0) {
            const existingData = typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content;
            const existingDate = existingData.date?.split('T')[0];
            if (existingDate === today) {
                return;
            }
        }
        
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('No astrology data found');
        }
        
        // Get planets with retrograde status
        const planetsData = await getCosmicWeatherPlanets();
        if (!planetsData.success) {
            throw new Error('Failed to calculate planets');
        }
        const planets = planetsData.planets;
        
        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);
        
        // Build detailed planet information with calculated positions and degrees
        const planetsText = planets
            .map(p => `${p.icon} ${p.name} in ${p.sign}${p.retrograde ? ' ♻️ (Retrograde)' : ''}`)
            .join(', ');
        
        const planetsDetailed = planets
            .map(p => `- ${p.icon} ${p.name} at ${p.degree}° in ${p.sign}${p.retrograde ? ' ♻️ RETROGRADE' : ''}`)
            .join('\n');
        
        const systemPrompt = getOracleSystemPrompt() + `

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
        
        const prompt = buildCosmicWeatherPrompt(userInfo, astrologyInfo, planets, planetsText, planetsDetailed, userGreeting);
        
        const oracleResponse = await callOracle(systemPrompt, [], prompt);
        
        await storeMessage(userId, 'cosmic_weather', {
            text: oracleResponse,
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
            generated_at: new Date().toISOString(),
            date: today
        });
    } catch (err) {
        console.error('[COSMIC-WEATHER-HANDLER] Error:', err.message);
        throw err;
    }
}

/**
 * Build comprehensive cosmic weather prompt
 */
function buildCosmicWeatherPrompt(userInfo, astrologyInfo, planets, planetsText, planetsDetailed, userGreeting) {
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
    
    prompt += `TODAY'S PLANETARY ALIGNMENTS:\n`;
    prompt += planetsDetailed + '\n\n';
    
    prompt += `COSMIC WEATHER ANALYSIS REQUIREMENTS:\n`;
    prompt += `- Show how each key planet today interacts with their natal Sun, Moon, and Rising signs\n`;
    prompt += `- Identify which life areas (relationships, career, health, creativity, spirituality) are most activated today\n`;
    prompt += `- Explain retrograde influences if applicable and how they specifically affect this person\n`;
    prompt += `- Provide 3-4 paragraphs of rich, personalized insight\n`;
    prompt += `- Address them directly by name and make this deeply personal\n`;
    prompt += `- Include practical guidance for working harmoniously with today's energies\n`;
    prompt += `- Suggest crystals or practices that align with their chart and today's planetary weather\n`;
    prompt += `- Be poetic, mystical, and deeply knowledgeable about astrology\n`;
    prompt += `- Show how today's transits either support or challenge their natal chart strengths\n`;
    prompt += `- Make specific references to their unique astrological signature`;
    
    return prompt;
}

/**
 * Get planetary house influences (simplified)
 */
function getHouseInfluence(planetName) {
    const influences = {
        'Sun': 'identity and self-expression',
        'Moon': 'emotions and home life',
        'Mercury': 'communication and thinking',
        'Venus': 'love and values',
        'Mars': 'action and desire',
        'Jupiter': 'expansion and luck',
        'Saturn': 'structure and responsibility',
        'Uranus': 'revolution and innovation',
        'Neptune': 'dreams and spirituality',
        'Pluto': 'transformation and power'
    };
    return influences[planetName] || 'cosmic influence';
}

export function isCosmicWeatherRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('cosmic weather');
}
