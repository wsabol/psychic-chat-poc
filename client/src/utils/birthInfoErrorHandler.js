/**
 * Birth Information Error Handler
 * Detects errors related to missing birth information
 * and provides professional messaging
 */

// Common error patterns that indicate missing birth information
const BIRTH_INFO_ERROR_PATTERNS = [
  'birth.*information',
  'birth.*data',
  'astrology.*data',
  'could not calculate',
  'missing.*birth',
  'no.*astrology',
  'birth chart.*not.*available',
  'personal.*information',
  'birth date',
];

/**
 * Checks if an error message indicates missing birth information
 * @param {string} errorMessage - The error message to check
 * @returns {boolean} - True if error appears to be related to missing birth info
 */
export function isBirthInfoError(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return false;
  }

  const lowerError = errorMessage.toLowerCase();
  return BIRTH_INFO_ERROR_PATTERNS.some(pattern => 
    new RegExp(pattern, 'i').test(lowerError)
  );
}

/**
 * Gets a professional error message for missing birth information
 * @returns {string} - User-friendly error message
 */
export function getBirthInfoErrorMessage() {
  return 'To access your personalized astrology readings, we need your birth information. Please visit Personal Information under My Account to complete your profile.';
}

/**
 * Checks if we should show the birth info prompt
 * Can check for empty birth chart data
 * @param {object} astroData - The astrology data object
 * @returns {boolean} - True if birth info is missing
 */
export function isBirthInfoMissing(astroData) {
  if (!astroData) return true;
  
  // Check if astrology_data exists and has the key fields
  const astro = astroData.astrology_data;
  if (!astro) return true;
  
  // Missing sun sign indicates no birth information was calculated
  return !astro.sun_sign;
}
