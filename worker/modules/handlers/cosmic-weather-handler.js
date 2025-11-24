import { fetchUserAstrology, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';

export async function generateCosmicWeather(userId) {
    try {
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('No astrology data found');
        }
        
        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);
        
        const systemPrompt = getOracleSystemPrompt() + `

SPECIAL REQUEST - COSMIC WEATHER:
Generate today's cosmic weather for ${userGreeting} based on their birth chart.
Keep it practical and actionable (2-3 sentences).
Focus on what matters TODAY.
Do NOT include tarot cards.
`;
        
        const prompt = `Today's Cosmic Weather for ${userGreeting}:
Birth Chart: ${astro.sun_sign} Sun, ${astro.moon_sign} Moon, ${astro.rising_sign} Rising

What cosmic energies are present today? How should they navigate them?`;
        
        const oracleResponse = await callOracle(systemPrompt, [], prompt);
        
        await storeMessage(userId, 'cosmic_weather', {
            text: oracleResponse,
            transits: [],
            generated_at: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        });
        
    } catch (err) {
        console.error('[COSMIC-WEATHER-HANDLER] Error:', err.message);
        throw err;
    }
}

export function isCosmicWeatherRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('cosmic weather');
}
