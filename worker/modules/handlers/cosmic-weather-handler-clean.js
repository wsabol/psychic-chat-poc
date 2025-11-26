import { fetchUserAstrology, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { getCurrentMoonPhase, getCurrentPlanets } from '../astrology.js';

export async function generateCosmicWeather(userId) {
    try {
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('No astrology data found');
        }
        
        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);
        
        let moonPhase = 'Unknown Phase';
        let planets = [];
        
        try {
            const moonData = await getCurrentMoonPhase();
            if (moonData.success) {
                moonPhase = moonData.phase;
            }
            
            console.log('[COSMIC-WEATHER] Calling getCurrentPlanets()...');
            const planetsData = await getCurrentPlanets();
            console.log('[COSMIC-WEATHER] getCurrentPlanets returned:', JSON.stringify(planetsData));
            if (planetsData && planetsData.success && planetsData.planets && planetsData.planets.length > 0) {
                planets = planetsData.planets;
                console.log('[COSMIC-WEATHER] ✓ Planets set, count:', planets.length);
            } else {
                console.warn('[COSMIC-WEATHER] ✗ Planets empty or failed:', planetsData);
            }
        } catch (err) {
            console.error('[COSMIC-WEATHER] Astro fetch EXCEPTION:', err.message, err);
        }
        
        const currentPlanets = planets
            .map(p => `${p.displayName} in ${p.sign}`)
            .join(', ');
        
        const systemPrompt = getOracleSystemPrompt() + `

SPECIAL REQUEST - COSMIC WEATHER:
Generate today's cosmic weather for ${userGreeting} based on their birth chart and CURRENT planetary positions.
Include insights about Mercury retrograde or other retrogrades if active.
Keep it practical and actionable (3-4 sentences).
Focus on what matters TODAY.
Do NOT include tarot cards.
`;
        
        const prompt = `Today's Cosmic Weather for ${userGreeting}:

NATAL BIRTH CHART:
- Sun in ${astro.sun_sign} (${astro.sun_degree}°)
- Moon in ${astro.moon_sign} (${astro.moon_degree}°)
- Rising Sign: ${astro.rising_sign} (${astro.rising_degree}°)

TODAY'S COSMIC ENVIRONMENT:
- Lunar Phase: ${moonPhase}
- Current Planetary Positions: ${currentPlanets}

Based on this natal chart and current cosmic conditions, what energies are at play today and how should ${userGreeting} work with them?`;
        
        const oracleResponse = await callOracle(systemPrompt, [], prompt);
        
        await storeMessage(userId, 'cosmic_weather', {
            text: oracleResponse,
            transits: planets,
            prompt: prompt,
            birthChart: {
                sunSign: astro.sun_sign,
                sunDegree: astro.sun_degree,
                moonSign: astro.moon_sign,
                moonDegree: astro.moon_degree,
                risingSign: astro.rising_sign,
                risingDegree: astro.rising_degree
            },
            currentPlanets: planets,
            moonPhase: moonPhase,
            generated_at: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        });
        
    } catch (err) {
        console.error('[COSMIC-WEATHER] Error:', err.message);
        throw err;
    }
}

export function isCosmicWeatherRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('cosmic weather');
}
