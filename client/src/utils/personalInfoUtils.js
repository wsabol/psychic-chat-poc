import { getAstrologyFromBirthDate, getZodiacSignFromDate } from './astroUtils';

/**
 * Prepare personal info data for submission
 * Calculates astrology data and applies temp account defaults
 */
export function preparePersonalInfoData(formData, isTemporaryAccount, storageBirthDate) {
  let astrologyData = null;
  let zodiacSign = null;

  // Calculate astrology from birth date
  if (storageBirthDate) {
    zodiacSign = getZodiacSignFromDate(storageBirthDate);
    astrologyData = getAstrologyFromBirthDate(storageBirthDate);
  }

  let dataToSend = {
    ...formData,
    birthDate: storageBirthDate,
    zodiacSign: zodiacSign,
    astrologyData: astrologyData
  };

  // Apply temp account defaults
  if (isTemporaryAccount) {
    dataToSend.firstName = dataToSend.firstName || 'Seeker';
    dataToSend.lastName = dataToSend.lastName || 'Soul';
    dataToSend.sex = dataToSend.sex || 'Unspecified';
  }

  return dataToSend;
}

/**
 * Check if temp user has all birth location data needed for astrology calculation
 */
export function hasBirthLocationData(formData) {
  return !!(
    formData.birthCountry &&
    formData.birthProvince &&
    formData.birthCity &&
    formData.birthTime
  );
}

/**
 * Get initial form data object with empty values
 */
export const INITIAL_FORM_DATA = {
  firstName: '',
  lastName: '',
  email: '',
  birthCountry: '',
  birthProvince: '',
  birthCity: '',
  birthDate: '',
  birthTime: '',
  sex: '',
  addressPreference: ''
};

/**
 * Sex/Gender options for form
 */
export const SEX_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Unspecified'];

/**
 * Constants for timing/config
 */
export const TIMING = {
  ASTROLOGY_POLL_MAX_ATTEMPTS: 30,
  ASTROLOGY_POLL_INTERVAL_MS: 100,
  SUCCESS_DISPLAY_MS: 3000
};
