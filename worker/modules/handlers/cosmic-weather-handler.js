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
                console.log('[COSMIC-WEATHER-HANDLER] Cosmic weather already generated for today, skipping');
                return;
            }
        }
        
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('No astrology data found');
        }
        
        // Get planets with retrograde status
        console.log('[COSMIC-WEATHER-HANDLER] Calculating planets...');
        const planetsData = await getCosmicWeatherPlanets();
        if (!planetsData.success) {
            throw new Error('Failed to calculate planets');
        }
        const planets = planetsData.planets;
        
        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);
        
        const planetsText = planets
            .map(p => `${p.icon} ${p.name} in ${p.sign}${p.retrograde ? ' ♻️' : ''}`)
            .join(', ');
        
        const systemPrompt = getOracleSystemPrompt() + `

SPECIAL REQUEST - COSMIC WEATHER:
Generate today's cosmic weather for ${userGreeting}.
Use their birth chart and current planetary positions to craft guidance.
Include retrograde effects if any planets are retrograde.
Keep it 2-3 sentences, practical and actionable.
Focus on TODAY's cosmic energies.
Do NOT include tarot cards.
`;
        
        const prompt = `Today's Cosmic Weather for ${userGreeting}:

Birth Chart: Sun ${astro.sun_sign}, Moon ${astro.moon_sign}, Rising ${astro.rising_sign}
Current Planets: ${planetsText}

What cosmic energies are at play today and how should they work with them?`;
        
        const oracleResponse = await callOracle(systemPrompt, [], prompt);
        
        await storeMessage(userId, 'cosmic_weather', {
            text: oracleResponse,
            birth_chart: {
                sun_sign: astro.sun_sign,
                sun_degree: astro.sun_degree,
                moon_sign: astro.moon_sign,
                moon_degree: astro.moon_degree,
                rising_sign: astro.rising_sign,
                rising_degree: astro.rising_degree
            },
            planets: planets,
            generated_at: new Date().toISOString(),
            date: today
        });
        
        console.log('[COSMIC-WEATHER-HANDLER] ✓ Cosmic weather generated successfully');
    } catch (err) {
        console.error('[COSMIC-WEATHER-HANDLER] Error:', err.message);
        throw err;
    }
}

export function isCosmicWeatherRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('cosmic weather');
}
