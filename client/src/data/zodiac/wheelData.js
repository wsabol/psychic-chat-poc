/**
 * Zodiac Wheel Data
 * Consolidated data for the zodiac wheel component
 * Includes: sign emojis, ruling planets, elements, and element emojis
 */

// Base wheel data with translation keys
export const wheelDataBase = {
  aries: {
    emoji: '♈',
    rulingPlanetKey: 'Mars',
    elementKey: 'Fire',
    elementEmoji: '🔥'
  },
  taurus: {
    emoji: '♉',
    rulingPlanetKey: 'Venus',
    elementKey: 'Earth',
    elementEmoji: '🌍'
  },
  gemini: {
    emoji: '♊',
    rulingPlanetKey: 'Mercury',
    elementKey: 'Air',
    elementEmoji: '💨'
  },
  cancer: {
    emoji: '♋',
    rulingPlanetKey: 'Moon',
    elementKey: 'Water',
    elementEmoji: '💧'
  },
  leo: {
    emoji: '♌',
    rulingPlanetKey: 'Sun',
    elementKey: 'Fire',
    elementEmoji: '🔥'
  },
  virgo: {
    emoji: '♍',
    rulingPlanetKey: 'Mercury',
    elementKey: 'Earth',
    elementEmoji: '🌍'
  },
  libra: {
    emoji: '♎',
    rulingPlanetKey: 'Venus',
    elementKey: 'Air',
    elementEmoji: '💨'
  },
  scorpio: {
    emoji: '♏',
    rulingPlanetKey: 'Mars',
    elementKey: 'Water',
    elementEmoji: '💧'
  },
  sagittarius: {
    emoji: '♐',
    rulingPlanetKey: 'Jupiter',
    elementKey: 'Fire',
    elementEmoji: '🔥'
  },
  capricorn: {
    emoji: '♑',
    rulingPlanetKey: 'Saturn',
    elementKey: 'Earth',
    elementEmoji: '🌍'
  },
  aquarius: {
    emoji: '♒',
    rulingPlanetKey: 'Uranus',
    elementKey: 'Air',
    elementEmoji: '💨'
  },
  pisces: {
    emoji: '♓',
    rulingPlanetKey: 'Neptune',
    elementKey: 'Water',
    elementEmoji: '💧'
  }
};

/**
 * Get localized wheel data
 * @param {Function} t - Translation function from TranslationContext
 * @returns {Object} Wheel data with translated planet and element names
 */
export const getLocalizedWheelData = (t) => {
  const localizedData = {};
  
  for (const [signKey, signData] of Object.entries(wheelDataBase)) {
    localizedData[signKey] = {
      emoji: signData.emoji,
      rulingPlanet: t(`zodiacWheel.planets.${signData.rulingPlanetKey}`),
      element: t(`zodiacWheel.elements.${signData.elementKey}`),
      elementEmoji: signData.elementEmoji
    };
  }
  
  return localizedData;
};

// Legacy export for backward compatibility (uses English keys)
export const wheelData = {
  aries: {
    emoji: '♈',
    rulingPlanet: 'Mars',
    element: 'Fire',
    elementEmoji: '🔥'
  },
  taurus: {
    emoji: '♉',
    rulingPlanet: 'Venus',
    element: 'Earth',
    elementEmoji: '🌍'
  },
  gemini: {
    emoji: '♊',
    rulingPlanet: 'Mercury',
    element: 'Air',
    elementEmoji: '💨'
  },
  cancer: {
    emoji: '♋',
    rulingPlanet: 'Moon',
    element: 'Water',
    elementEmoji: '💧'
  },
  leo: {
    emoji: '♌',
    rulingPlanet: 'Sun',
    element: 'Fire',
    elementEmoji: '🔥'
  },
  virgo: {
    emoji: '♍',
    rulingPlanet: 'Mercury',
    element: 'Earth',
    elementEmoji: '🌍'
  },
  libra: {
    emoji: '♎',
    rulingPlanet: 'Venus',
    element: 'Air',
    elementEmoji: '💨'
  },
  scorpio: {
    emoji: '♏',
    rulingPlanet: 'Mars',
    element: 'Water',
    elementEmoji: '💧'
  },
  sagittarius: {
    emoji: '♐',
    rulingPlanet: 'Jupiter',
    element: 'Fire',
    elementEmoji: '🔥'
  },
  capricorn: {
    emoji: '♑',
    rulingPlanet: 'Saturn',
    element: 'Earth',
    elementEmoji: '🌍'
  },
  aquarius: {
    emoji: '♒',
    rulingPlanet: 'Uranus',
    element: 'Air',
    elementEmoji: '💨'
  },
  pisces: {
    emoji: '♓',
    rulingPlanet: 'Neptune',
    element: 'Water',
    elementEmoji: '💧'
  }
};

export default wheelData;
