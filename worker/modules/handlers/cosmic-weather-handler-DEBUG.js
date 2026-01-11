import { fetchUserAstrology, fetchUserLanguagePreference, fetchUserOracleLanguagePreference, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { translateContentObject } from '../translator.js';
import { getUserTimezone, getLocalDateForTimezone, needsRegeneration } from '../utils/timezoneHelper.js';
import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';

const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function generateCosmicWeatherPlanets() {
    const planets = [];
    const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    
    planetNames.forEach((name) => {
        const signIdx = Math.floor(Math.random() * ZODIAC_SIGNS.length);
        const degree = Math.floor(Math.random() * 30) + Math.floor(Math.random() * 100) / 100;
        const retrograde = Math.random() > 0.85;
        
        planets.push({
            name: name,
            sign: ZODIAC_SIGNS[signIdx],
            degree: parseFloat(degree.toFixed(2)),
            retrograde: retrograde,
            icon: ''
        });
    });
    
    return planets;
}

export async function generateCosmicWeather(userId) {
    
    try {
        const userIdHash = hashUserId(userId);
        
        const userTimezone = await getUserTimezone(userIdHash);
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
        const { rows } = await db.query(
            `SELECT id, created_at_local_date FROM messages WHERE user_id_hash = $1 AND role = 'cosmic_weather' ORDER BY created_at DESC LIMIT 1`,
            [userIdHash]
        );
        
        if (rows.length > 0) {
            const createdAtLocalDate = rows[0].created_at_local_date;
            if (!needsRegeneration(createdAtLocalDate, todayLocalDate)) {
                return;
            }
        }
        
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        const oracleLanguage = await fetchUserOracleLanguagePreference(userId);
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('No astrology data found');
        }
        
        const planets = generateCosmicWeatherPlanets();
        const astro = astrologyInfo.astrology_data;
        const userGreeting = getUserGreeting(userInfo, userId);
        
        const planetsDetailed = planets
            .map(p => `- ${p.name} at ${p.degree}° in ${p.sign}${p.retrograde ? ' RETROGRADE' : ''}`)
            .join('\n');
        
        const systemPrompt = getOracleSystemPrompt(false, oracleLanguage) + `

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
        
        let cosmicWeatherDataLang = null;
        let cosmicWeatherDataBriefLang = null;
        
        if (userLanguage && userLanguage !== 'en-US') {
            cosmicWeatherDataLang = await translateContentObject(cosmicWeatherDataFull, userLanguage);
            cosmicWeatherDataBriefLang = await translateContentObject(cosmicWeatherDataBrief, userLanguage);
        }
        
        await storeMessage(
            userId, 
            'cosmic_weather', 
            cosmicWeatherDataFull, 
            cosmicWeatherDataBrief,
            userLanguage,
            userLanguage !== 'en-US' ? cosmicWeatherDataLang : null,
            userLanguage !== 'en-US' ? cosmicWeatherDataBriefLang : null,
            null,
            null,
            null,
            todayLocalDate
        );
        
    } catch (err) {
        console.error('[COSMIC-WEATHER] Error:', err.message);
        console.error('[COSMIC-WEATHER] Stack:', err.stack);
        throw err;
    }
}

function buildCosmicWeatherPrompt(userInfo, astrologyInfo, planets, planetsDetailed, userGreeting) {
    const astro = astrologyInfo.astrology_data;
    let prompt = 'Generate today\'s comprehensive cosmic weather for ' + userGreeting + ':\n\n';
    prompt += 'COMPLETE BIRTH CHART:\n';
    prompt += '- Sun Sign: ' + astro.sun_sign + ' (' + astro.sun_degree + '°)\n';
    prompt += '- Moon Sign: ' + astro.moon_sign + ' (' + astro.moon_degree + '°)\n';
    prompt += '- Rising Sign: ' + astro.rising_sign + ' (' + astro.rising_degree + '°)\n';
    if (astro.venus_sign) prompt += '- Venus Sign: ' + astro.venus_sign + ' (' + astro.venus_degree + '°)\n';
    if (astro.mars_sign) prompt += '- Mars Sign: ' + astro.mars_sign + ' (' + astro.mars_degree + '°)\n';
    if (astro.mercury_sign) prompt += '- Mercury Sign: ' + astro.mercury_sign + ' (' + astro.mercury_degree + '°)\n';
    prompt += '\nTODAY\'S PLANETARY POSITIONS:\n' + planetsDetailed + '\n\nProvide a rich, personalized reading addressing how today\'s planetary positions interact with their chart.';
    return prompt;
}

export function isCosmicWeatherRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('cosmic weather');
}

