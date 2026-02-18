/**
 * Zodiac Sign Translation Utility
 * Ensures all zodiac signs from Python Lambda are normalized to English
 */

// Map of Spanish zodiac signs to English
const ZODIAC_TRANSLATIONS = {
    // Spanish to English
    'aries': 'aries',
    'tauro': 'taurus',
    'géminis': 'gemini',
    'geminis': 'gemini',
    'cáncer': 'cancer',
    'cancer': 'cancer',
    'leo': 'leo',
    'virgo': 'virgo',
    'libra': 'libra',
    'escorpio': 'scorpio',
    'escorpión': 'scorpio',
    'sagitario': 'sagittarius',
    'capricornio': 'capricorn',
    'acuario': 'aquarius',
    'piscis': 'pisces',
    
    // English (passthrough)
    'taurus': 'taurus',
    'gemini': 'gemini',
    'scorpio': 'scorpio',
    'sagittarius': 'sagittarius',
    'capricorn': 'capricorn',
    'aquarius': 'aquarius',
    'pisces': 'pisces'
};

/**
 * Translate a zodiac sign name to English
 * @param {string} signName - Sign name in any language
 * @returns {string} Sign name in English (lowercase)
 */
export function translateZodiacSign(signName) {
    if (!signName) return signName;
    
    const normalized = signName.toLowerCase().trim();
    return ZODIAC_TRANSLATIONS[normalized] || normalized;
}

/**
 * Translate zodiac signs in a planet object
 * @param {Object} planet - Planet object with sign property
 * @returns {Object} Planet object with translated sign
 */
export function translatePlanetSign(planet) {
    if (!planet) return planet;
    
    return {
        ...planet,
        sign: planet.sign ? translateZodiacSign(planet.sign) : planet.sign
    };
}

/**
 * Translate zodiac signs in an array of planets
 * @param {Array} planets - Array of planet objects
 * @returns {Array} Array of planet objects with translated signs
 */
export function translatePlanetsArray(planets) {
    if (!Array.isArray(planets)) return planets;
    
    return planets.map(translatePlanetSign);
}

/**
 * Translate zodiac signs in astrology data object
 * @param {Object} astrologyData - Astrology data object
 * @returns {Object} Astrology data with translated signs
 */
export function translateAstrologyData(astrologyData) {
    if (!astrologyData) return astrologyData;
    
    const translated = { ...astrologyData };
    
    // Translate main signs
    if (translated.sun_sign) translated.sun_sign = translateZodiacSign(translated.sun_sign);
    if (translated.moon_sign) translated.moon_sign = translateZodiacSign(translated.moon_sign);
    if (translated.rising_sign) translated.rising_sign = translateZodiacSign(translated.rising_sign);
    if (translated.mercury_sign) translated.mercury_sign = translateZodiacSign(translated.mercury_sign);
    if (translated.venus_sign) translated.venus_sign = translateZodiacSign(translated.venus_sign);
    if (translated.mars_sign) translated.mars_sign = translateZodiacSign(translated.mars_sign);
    if (translated.jupiter_sign) translated.jupiter_sign = translateZodiacSign(translated.jupiter_sign);
    if (translated.saturn_sign) translated.saturn_sign = translateZodiacSign(translated.saturn_sign);
    if (translated.uranus_sign) translated.uranus_sign = translateZodiacSign(translated.uranus_sign);
    if (translated.neptune_sign) translated.neptune_sign = translateZodiacSign(translated.neptune_sign);
    if (translated.pluto_sign) translated.pluto_sign = translateZodiacSign(translated.pluto_sign);
    
    // Translate zodiac_sign if present
    if (translated.zodiac_sign) translated.zodiac_sign = translateZodiacSign(translated.zodiac_sign);
    
    return translated;
}
