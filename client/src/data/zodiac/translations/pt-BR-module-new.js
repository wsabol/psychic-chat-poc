import { zodiacSymbols } from '../modules/zodiac-symbols.js';
import { translations as ptBrTranslations1to4 } from './pt-BR-signs-1-4.js';
import { translations as ptBrTranslations5to8 } from './pt-BR-signs-5-8.js';
import { translations as ptBrTranslations9to12 } from './pt-BR-signs-9-12.js';

const translations = {
  ...ptBrTranslations1to4,
  ...ptBrTranslations5to8,
  ...ptBrTranslations9to12
};

// Smart merge function - combines zodiac data with translations
function mergeTranslations(zodiacSign, translation) {
  return { ...zodiacSign, ...translation };
}

// Export merged zodiac signs for all 12 signs
export const zodiacSigns = {
  aries: mergeTranslations(zodiacSymbols.aries, translations.aries),
  taurus: mergeTranslations(zodiacSymbols.taurus, translations.taurus),
  gemini: mergeTranslations(zodiacSymbols.gemini, translations.gemini),
  cancer: mergeTranslations(zodiacSymbols.cancer, translations.cancer),
  leo: mergeTranslations(zodiacSymbols.leo, translations.leo),
  virgo: mergeTranslations(zodiacSymbols.virgo, translations.virgo),
  libra: mergeTranslations(zodiacSymbols.libra, translations.libra),
  scorpio: mergeTranslations(zodiacSymbols.scorpio, translations.scorpio),
  sagittarius: mergeTranslations(zodiacSymbols.sagittarius, translations.sagittarius),
  capricorn: mergeTranslations(zodiacSymbols.capricorn, translations.capricorn),
  aquarius: mergeTranslations(zodiacSymbols.aquarius, translations.aquarius),
  pisces: mergeTranslations(zodiacSymbols.pisces, translations.pisces)
};

export default zodiacSigns;
