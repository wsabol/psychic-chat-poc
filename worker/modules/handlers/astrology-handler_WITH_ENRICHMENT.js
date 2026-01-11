import { db } from '../../shared/db.js';
import { calculateBirthChart } from '../astrology.js';

// Zodiac data for enrichment
const zodiacData = {
  aries: { name: "Aries", dates: "March 21 - April 19", element: "Fire", planet: "Mars", symbol: "♈", emoji: "🐏", personality: "Bold, ambitious, and energetic. You're a natural leader who thrives on challenges and new beginnings. Your pioneering spirit drives you to explore uncharted territories.", strengths: ["Natural leadership", "Courage and determination", "Innovative thinking", "High energy and enthusiasm", "Quick decision-making"], weaknesses: ["Impatience", "Tendency to be impulsive", "Can be overly competitive", "Difficulty with routine tasks", "May act before thinking"], lifePath: "Your cosmic journey involves learning to balance your fierce independence with collaboration. You're meant to initiate new projects and inspire others to action.", opportunities: "Leadership roles, entrepreneurial ventures, sports, emergency services, and any field requiring quick thinking and decisive action.", challenges: "Learning patience, considering others' perspectives, and following through on long-term commitments.", compatibility: { mostCompatible: ["Leo", "Sagittarius", "Gemini", "Aquarius"], leastCompatible: ["Cancer", "Capricorn"], soulmate: "Leo", description: "Fire signs ignite your passion, while air signs fuel your ideas. Earth signs may slow you down, and water signs can dampen your enthusiasm." }, luckyElements: { numbers: [1, 8, 17, 21, 31], colors: ["Red", "Orange", "Bright Yellow", "Scarlet"], days: ["Tuesday", "Sunday"], stones: ["Diamond", "Ruby", "Bloodstone", "Red Jasper"], metals: ["Iron", "Steel"] }, careerSpecific: { ideal: ["Military Officer", "Emergency Room Doctor", "Entrepreneur", "Professional Athlete", "Fire Fighter", "Sales Manager"], avoid: ["Librarian", "Data Entry Clerk", "Night Security Guard"], leadership: "Natural CEO material - you excel when pioneering new ventures" }, health: { bodyParts: ["Head", "Face", "Brain", "Upper jaw"], tendencies: ["Headaches", "Eye strain", "Facial injuries", "High blood pressure", "Stress-related issues"], recommendations: ["Regular cardiovascular exercise", "Stress management techniques", "Protect head during sports", "Maintain healthy sleep schedule"] }, mythology: { origin: "The Golden Ram that rescued Phrixus and Helle in Greek mythology", story: "Aries represents the ram whose golden fleece was sought by Jason and the Argonauts. The ram saved the children of King Athamas by flying them to safety, sacrificing itself for their protection.", archetype: "The Warrior-Pioneer", deity: "Ares (Mars) - God of War and Courage" }, moonPhases: { newMoon: "Perfect time for starting new projects and setting ambitious goals. Your pioneering energy is at its peak for fresh beginnings.", waxingCrescent: "Build momentum on your initiatives. Your natural leadership begins to attract followers and support for your ventures.", firstQuarter: "Overcome obstacles with determination. This is when your warrior spirit shines brightest in facing challenges head-on.", waxingGibbous: "Refine your strategies and gather resources. Your competitive nature helps you optimize and improve your approaches.", fullMoon: "Peak energy for leadership and taking decisive action. Your charisma and confidence are magnetically powerful.", waningGibbous: "Share your victories and mentor others. Your experiences become valuable lessons for those following your path.", lastQuarter: "Release what no longer serves your ambitions. Clear away outdated goals to make space for new conquests.", waningCrescent: "Rest and reflect before your next adventure. Your high-energy nature needs this quiet time for strategic planning.", influence: "Fire moon phases amplify your natural pioneering spirit, while cardinal moon energies align with your leadership instincts." }, seasonal: { season: "Spring Equinox", energy: "Renewal, rebirth, and new beginnings", connection: "You embody the explosive energy of spring's arrival and nature's awakening", bestSeason: "Spring - when your natural pioneering spirit aligns with nature's renewal" } },
  aquarius: { name: "Aquarius", dates: "January 20 - February 18", element: "Air", planet: "Uranus", symbol: "♒", emoji: "🏺", personality: "Independent, innovative, and humanitarian. You march to your own drum and envision a better future for all. Your unique perspective challenges conventional thinking.", strengths: ["Independent thinking", "Humanitarian spirit", "Innovation", "Intellectual curiosity", "Friendship-focused"], weaknesses: ["Emotional detachment", "Rebellious nature", "Can be unpredictable", "Difficulty with intimacy", "Stubborn about beliefs"], lifePath: "Your path involves bringing innovation and humanitarian progress to the world while learning to balance independence with meaningful connections.", opportunities: "Technology, social causes, science, invention, group leadership, and fields involving future-thinking or reform.", challenges: "Developing emotional intimacy, learning when to conform, and balancing idealism with practical action.", compatibility: { mostCompatible: ["Gemini", "Libra", "Aries", "Sagittarius"], leastCompatible: ["Taurus", "Scorpio"], soulmate: "Gemini", description: "Air signs stimulate your intellect, fire signs support your independence. Earth signs may seem too conventional, water signs too emotionally demanding." }, luckyElements: { numbers: [4, 11, 22, 29, 38], colors: ["Electric Blue", "Silver", "Purple", "Neon Green"], days: ["Wednesday", "Saturday"], stones: ["Amethyst", "Aquamarine", "Fluorite", "Labradorite"], metals: ["Aluminum", "Uranium"] }, careerSpecific: { ideal: ["Social Activist", "Tech Innovator", "Scientist", "Humanitarian Worker", "Inventor", "Community Organizer"], avoid: ["Traditional Banking", "Routine Manufacturing", "Conservative Politics"], leadership: "Revolutionary leadership that challenges status quo and inspires collective change" }, health: { bodyParts: ["Ankles", "Calves", "Circulatory system", "Nervous system"], tendencies: ["Circulatory problems", "Ankle injuries", "Nervous disorders", "Varicose veins", "Stress-related issues"], recommendations: ["Cardiovascular exercise", "Ankle strengthening", "Stress reduction", "Regular circulation checks", "Nervous system support"] }, mythology: { origin: "The water-bearer Ganymede, cupbearer to the gods", story: "Ganymede was chosen by Zeus to serve as cupbearer to the gods, pouring the waters of life and knowledge. Represents the gift of bringing divine wisdom to humanity.", archetype: "The Revolutionary-Humanitarian", deity: "Uranus - God of Sky and Innovation" }, moonPhases: { newMoon: "Perfect for humanitarian projects and innovative breakthroughs. Your revolutionary spirit births new solutions for collective problems.", waxingCrescent: "Build your network of like-minded reformers and gather support for your cause. Your vision attracts fellow revolutionaries.", firstQuarter: "Break through conventional limitations and outdated systems. Your rebellious nature challenges status quo effectively.", waxingGibbous: "Refine your innovative ideas and organize your humanitarian efforts. Your unique perspective creates lasting change.", fullMoon: "Peak time for group activities and social reform. Your ability to inspire collective action reaches maximum power.", waningGibbous: "Share your innovations and teach others to think independently. Your freedom-loving nature liberates trapped minds.", lastQuarter: "Release attachment to being different and embrace authentic uniqueness. True individuality doesn't need to rebel.", waningCrescent: "Detach from group energies and reconnect with your individual truth. This solitude reveals your authentic vision.", influence: "Air moon phases enhance your natural ability to think outside the box and connect with groups, while Uranus-influenced moons amplify your innovative and revolutionary nature." }, seasonal: { season: "Deep Winter", energy: "Innovation, detachment, and future-focused thinking", connection: "You channel the detached clarity of deep winter, when the mind can envision new possibilities free from emotional entanglement", bestSeason: "Late Winter - when planning for future growth and change" } },
};

/**
 * Handle system astrology calculation requests
 * Triggered by [SYSTEM] messages containing "birth chart"
 */
export async function handleAstrologyCalculation(userId) {
    try {
        // Fetch user's personal information
        const { rows: personalInfoRows } = await db.query(`
            SELECT pgp_sym_decrypt(birth_date_encrypted, $1) as birth_date, pgp_sym_decrypt(birth_time_encrypted, $1) as birth_time, pgp_sym_decrypt(birth_country_encrypted, $1) as birth_country, pgp_sym_decrypt(birth_province_encrypted, $1) as birth_province, pgp_sym_decrypt(birth_city_encrypted, $1) as birth_city, pgp_sym_decrypt(birth_timezone_encrypted, $1) as birth_timezone
            FROM user_personal_info WHERE user_id = $2
        `, [process.env.ENCRYPTION_KEY, userId]);
        
        if (personalInfoRows.length === 0) {
            return;
        }
        
        const info = personalInfoRows[0];
        
        // Check if we have complete birth data
        if (!info.birth_date || !info.birth_time || !info.birth_country || !info.birth_province || !info.birth_city) {
            return;
        }
        
        // Calculate birth chart
        const calculatedChart = await calculateBirthChart({
            birth_date: info.birth_date,
            birth_time: info.birth_time,
            birth_country: info.birth_country,
            birth_province: info.birth_province,
            birth_city: info.birth_city,
            birth_timezone: info.birth_timezone
        });
        
        // Verify calculation was successful
        if (!calculatedChart.success || !calculatedChart.rising_sign || !calculatedChart.moon_sign) {
            return;
        }
        
        // Get zodiac enrichment data for sun sign
        const sunSignKey = calculatedChart.sun_sign.toLowerCase();
        const zodiacEnrichment = zodiacData[sunSignKey] || {};
        
        // Format astrology data: merge calculated birth chart with zodiac enrichment
        const astrologyData = {
            // Calculated birth chart data
            rising_sign: calculatedChart.rising_sign,
            rising_degree: calculatedChart.rising_degree,
            moon_sign: calculatedChart.moon_sign,
            moon_degree: calculatedChart.moon_degree,
            sun_sign: calculatedChart.sun_sign,
            sun_degree: calculatedChart.sun_degree,
            north_node_sign: calculatedChart.north_node_sign,
            north_node_degree: calculatedChart.north_node_degree,
            south_node_sign: calculatedChart.south_node_sign,
            south_node_degree: calculatedChart.south_node_degree,
            latitude: calculatedChart.latitude,
            longitude: calculatedChart.longitude,
            timezone: calculatedChart.timezone,
            calculated_at: new Date().toISOString(),
            
            // Merged zodiac enrichment data
            ...zodiacEnrichment
        };
        
        // Store in database
        await db.query(
            `INSERT INTO user_astrology (user_id, zodiac_sign, astrology_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
             astrology_data = EXCLUDED.astrology_data,
             updated_at = CURRENT_TIMESTAMP`,
            [userId, calculatedChart.sun_sign, JSON.stringify(astrologyData)]
        );
    } catch (err) {
        console.error('[ASTROLOGY-HANDLER] Error:', err.message);
    }
}

/**
 * Check if message is an astrology calculation request
 */
export function isAstrologyRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('birth chart');
}

