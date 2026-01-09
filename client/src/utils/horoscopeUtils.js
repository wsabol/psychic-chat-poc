import { getTranslatedAstrologyData } from './translatedAstroUtils';

/**
 * Horoscope page constants
 */
export const HOROSCOPE_CONFIG = {
  POLL_INTERVAL_MS: 1000,
  POLL_MAX_ATTEMPTS: 60,
  POLL_INITIAL_DELAY_MS: 2000,
  VOICE_AUTO_PLAY_DELAY_MS: 500,
  VOICE_RATE: 0.95,
  VOICE_PITCH: 1.2,
  RANGES: ['daily', 'weekly']
};

/**
 * Build horoscope response object from API data
 */
export function buildHoroscopeData(apiData, horoscopeRange) {
  return {
    text: apiData.horoscope,
    brief: apiData.brief,
    generatedAt: apiData.generated_at,
    range: horoscopeRange
  };
}

/**
 * Build compliance modal props object
 */
export function buildComplianceModalProps(userId, token, complianceStatus, onConsentUpdated) {
  return {
    userId,
    token,
    compliance: {
      blocksAccess: true,
      requiresTermsUpdate: complianceStatus.requiresTermsUpdate,
      requiresPrivacyUpdate: complianceStatus.requiresPrivacyUpdate,
      termsVersion: {
        requiresReacceptance: complianceStatus.requiresTermsUpdate,
        current: complianceStatus.termsVersion
      },
      privacyVersion: {
        requiresReacceptance: complianceStatus.requiresPrivacyUpdate,
        current: complianceStatus.privacyVersion
      }
    },
    onConsentUpdated
  };
}

/**
 * Get text to speak (brief or full horoscope)
 */
export function getTextToSpeak(horoscopeData, showingBrief) {
  return showingBrief && horoscopeData?.brief ? horoscopeData.brief : horoscopeData?.text;
}

/**
 * Load sun sign data with translations
 */
export async function loadSunSignData(astroInfo, language) {
  if (!astroInfo?.astrology_data?.sun_sign) {
    return null;
  }

  const signKey = astroInfo.astrology_data.sun_sign.toLowerCase();
  const data = await getTranslatedAstrologyData(signKey, language);
  const englishData = await getTranslatedAstrologyData(signKey, 'en-US');

  return {
    ...data,
    _englishElement: englishData?.element,
    _englishRulingPlanet: englishData?.rulingPlanet
  };
}
