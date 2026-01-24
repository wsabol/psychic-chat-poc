/**
 * Moon Phase Utilities
 * Handles moon phase calculations, emojis, and translation key mapping
 */

export const moonPhaseEmojis = {
  newMoon: '🌑',
  waxingCrescent: '🌒',
  firstQuarter: '🌓',
  waxingGibbous: '🌔',
  fullMoon: '🌕',
  waningGibbous: '🌖',
  lastQuarter: '🌗',
  waningCrescent: '🌘'
};

export const moonPhaseOrder = [
  'newMoon',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'fullMoon',
  'waningGibbous',
  'lastQuarter',
  'waningCrescent'
];

/**
 * Map phase names to translation keys
 */
export const getPhaseTranslationKey = (phase) => {
  const keyMap = {
    'newMoon': 'new',
    'fullMoon': 'full',
    'waxingCrescent': 'waxingCrescent',
    'firstQuarter': 'firstQuarter',
    'waxingGibbous': 'waxingGibbous',
    'waningGibbous': 'waningGibbous',
    'lastQuarter': 'lastQuarter',
    'waningCrescent': 'waningCrescent',
  };
  return keyMap[phase] || phase;
};

/**
 * Calculate current moon phase based on date
 */
export const calculateMoonPhase = () => {
  const now = new Date();
  const knownNewMoonDate = new Date(2025, 0, 29).getTime();
  const currentDate = now.getTime();
  const lunarCycle = 29.53059 * 24 * 60 * 60 * 1000;
  
  const daysIntoPhase = ((currentDate - knownNewMoonDate) % lunarCycle) / (24 * 60 * 60 * 1000);
  const phaseIndex = Math.floor((daysIntoPhase / 29.53059) * 8) % 8;
  
  return moonPhaseOrder[phaseIndex];
};
