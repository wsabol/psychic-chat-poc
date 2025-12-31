import { useState, useCallback, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';
import { isBirthInfoError } from '../../../utils/birthInfoErrorHandler';
import { useTranslation } from '../../../context/TranslationContext';

/**
 * Hook to fetch and merge astrology data with zodiac enrichment
 */
export function useAstrologyData(userId, token) {
  const { language } = useTranslation();
  const [astroData, setAstroData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zodiacSigns, setZodiacSigns] = useState(null);

  // Load zodiac signs in the current language
  useEffect(() => {
    const loadZodiacSigns = async () => {
      try {
        const languageMap = {
          'en-US': 'en-US',
          'es-ES': 'es-ES',
          'fr-FR': 'fr-FR',
          'de-DE': 'de-DE',
          'it-IT': 'it-IT',
          'pt-BR': 'pt-BR',
          'ja-JP': 'ja-JP',
          'zh-CN': 'zh-CN'
        };
        
        const langCode = languageMap[language] || 'en-US';
        console.log('[ASTROLOGY] Loading zodiac signs for language:', langCode);
        const module = await import(`../../../data/zodiac/translations/${langCode}-module.js`);
        setZodiacSigns(module.zodiacSigns);
        console.log('[ASTROLOGY] Zodiac signs loaded for:', langCode);
      } catch (err) {
        console.error('[ASTROLOGY] Failed to load zodiac signs:', language, err);
        try {
          const module = await import('../../../data/zodiac/translations/en-US-module.js');
          setZodiacSigns(module.zodiacSigns);
        } catch (fallbackErr) {
          console.error('[ASTROLOGY] Fallback failed:', fallbackErr);
          setError('Unable to load zodiac data');
        }
      }
    };
    loadZodiacSigns();
  }, [language]);

    const fetchAstrologyData = useCallback(async () => {
    if (!zodiacSigns) {
      console.log('[ASTROLOGY] Waiting for zodiac signs...');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
      
      const response = await fetchWithTokenRefresh(`${API_URL}/user-astrology/${userId}`, { 
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Your birth chart is being calculated. Please refresh in a moment.';
        
        // Check if this is a birth info error
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      let astroDataObj = data.astrology_data;
      if (typeof astroDataObj === 'string') {
        astroDataObj = JSON.parse(astroDataObj);
      }

            const sunSignKey = astroDataObj.sun_sign?.toLowerCase();
      const zodiacEnrichment = zodiacSigns[sunSignKey] || {};

      const mergedAstroData = {
        ...zodiacEnrichment,
        ...astroDataObj,
        sun_sign: astroDataObj.sun_sign,
        moon_sign: astroDataObj.moon_sign,
        rising_sign: astroDataObj.rising_sign,
        sun_degree: astroDataObj.sun_degree,
        moon_degree: astroDataObj.moon_degree,
        rising_degree: astroDataObj.rising_degree
      };

      setAstroData({
        ...data,
        astrology_data: mergedAstroData
      });
      setLoading(false);
    } catch (err) {
      setError('Unable to load your birth chart. Please try again.');
      setLoading(false);
    }
    }, [userId, token, zodiacSigns]);

  useEffect(() => {
    if (zodiacSigns) {
      fetchAstrologyData();
    }
  }, [zodiacSigns, userId, token, fetchAstrologyData]);

  return {
    astroData,
    loading,
    error,
    fetchAstrologyData
  };
}
