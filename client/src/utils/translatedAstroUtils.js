// Map sign names to their numbers (1-12)
const SIGN_NUMBER_MAP = {
  aries: 1,
  taurus: 2,
  gemini: 3,
  cancer: 4,
  leo: 5,
  virgo: 6,
  libra: 7,
  scorpio: 8,
  sagittarius: 9,
  capricorn: 10,
  aquarius: 11,
  pisces: 12
};

// Get the file range (1-4, 5-8, or 9-12) for a sign number
function getSignFileRange(signNumber) {
  if (signNumber >= 1 && signNumber <= 4) return '1-4';
  if (signNumber >= 5 && signNumber <= 8) return '5-8';
  if (signNumber >= 9 && signNumber <= 12) return '9-12';
  return null;
}

/**
 * Get translated astrology data for a zodiac sign in a specific language
 * Dynamically loads the correct translation file based on sign and language
 * @param {string} zodiacSignKey - Zodiac sign key (lowercase, e.g., 'aries')
 * @param {string} languageCode - Language code (e.g., 'es-ES', 'en-US')
 * @returns {Promise<object|null>} - Complete translated astrology data or null
 */
export async function getTranslatedAstrologyData(zodiacSignKey, languageCode = 'en-US') {
  if (!zodiacSignKey) return null;
  
  const signKey = zodiacSignKey.toLowerCase();
  const signNumber = SIGN_NUMBER_MAP[signKey];
  if (!signNumber) return null;
  
  const fileRange = getSignFileRange(signNumber);
  if (!fileRange) return null;
  
  try {
    const module = await import(`../data/zodiac/translations/${languageCode}-signs-${fileRange}.js`);
    if (module.translations && module.translations[signKey]) {
      return module.translations[signKey];
    }
  } catch (error) {
    console.warn(`Failed to load ${languageCode}-signs-${fileRange}.js for ${signKey}, trying en-US:`, error);
    
    // Fallback to English if translation fails
    if (languageCode !== 'en-US') {
      try {
        const enModule = await import(`../data/zodiac/translations/en-US-signs-${fileRange}.js`);
        if (enModule.translations && enModule.translations[signKey]) {
          return enModule.translations[signKey];
        }
      } catch (enError) {
        console.error(`Failed to load en-US-signs-${fileRange}.js:`, enError);
      }
    }
  }
  
  return null;
}
