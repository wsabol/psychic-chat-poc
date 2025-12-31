import { zodiacSymbols } from '../modules/zodiac-symbols.js';
import { translations as jaJpTranslations1to4 } from './ja-JP-signs-1-4.js';
import { translations as jaJpTranslations5to8 } from './ja-JP-signs-5-8.js';
import { translations as jaJpTranslations9to12 } from './ja-JP-signs-9-12.js';

const translations = {
  ...jaJpTranslations1to4,
  ...jaJpTranslations5to8,
  ...jaJpTranslations9to12
};

function mergeTranslations(zodiacSign, translation) {
  return { ...zodiacSign, ...translation };
}

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
