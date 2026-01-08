import { useState, useEffect } from 'react';
import { getTranslatedAstrologyData } from '../utils/translatedAstroUtils';

/**
 * useSunSignData Hook
 * Loads and translates sun sign data
 */
export function useSunSignData(astroInfo, language) {
  const [sunSignData, setSunSignData] = useState(null);

  useEffect(() => {
    const loadSunSignData = async () => {
      if (astroInfo?.astrology_data?.sun_sign) {
        const signKey = astroInfo.astrology_data.sun_sign.toLowerCase();
        const data = await getTranslatedAstrologyData(signKey, language);
        const englishData = await getTranslatedAstrologyData(signKey, 'en-US');
        setSunSignData({
          ...data,
          _englishElement: englishData?.element,
          _englishRulingPlanet: englishData?.rulingPlanet
        });
      } else {
        setSunSignData(null);
      }
    };

    loadSunSignData();
  }, [astroInfo, language]);

  return sunSignData;
}
