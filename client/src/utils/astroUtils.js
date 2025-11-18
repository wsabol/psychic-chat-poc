import { zodiacSigns } from '../data/ZodiacSigns';

/**
 * Calculate zodiac sign from birth date
 * @param {string} dateString - Birth date in YYYY-MM-DD format
 * @returns {string|null} - Zodiac sign key (lowercase) or null if invalid
 */
export function getZodiacSignFromDate(dateString) {
  if (!dateString) return null;

  // Parse date string manually to avoid timezone issues
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;

  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  // Aries: March 21 - April 19
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';

  // Taurus: April 20 - May 20
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';

  // Gemini: May 21 - June 20
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';

  // Cancer: June 21 - July 22
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';

  // Leo: July 23 - August 22
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';

  // Virgo: August 23 - September 22
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';

  // Libra: September 23 - October 22
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';

  // Scorpio: October 23 - November 21
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';

  // Sagittarius: November 22 - December 21
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';

  // Capricorn: December 22 - January 19
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';

  // Aquarius: January 20 - February 18
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';

  // Pisces: February 19 - March 20
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces';

  return null;
}

/**
 * Get complete astrology data for a zodiac sign
 * @param {string} zodiacSignKey - Zodiac sign key (lowercase, e.g., 'aries')
 * @returns {object|null} - Complete astrology data object or null
 */
export function getAstrologyData(zodiacSignKey) {
  if (!zodiacSignKey || !zodiacSigns[zodiacSignKey]) {
    return null;
  }
  return zodiacSigns[zodiacSignKey];
}

/**
 * Get astrology data for a given birth date
 * @param {string} dateString - Birth date in YYYY-MM-DD format
 * @returns {object|null} - Complete astrology data or null
 */
export function getAstrologyFromBirthDate(dateString) {
  const sign = getZodiacSignFromDate(dateString);
  if (!sign) return null;
  return getAstrologyData(sign);
}

/**
 * Calculate Rising Sign (Ascendant) from birth time
 * NOTE: This is a simplified calculation. For precise results, actual ephemeris data 
 * and geographic coordinates are needed. The oracle's calculation is authoritative.
 * This function should return null to defer to the oracle's calculation.
 * @param {string} birthTime - Birth time in HH:MM format (24-hour)
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @returns {null} - Always returns null to allow oracle to calculate
 */
export function getRisingSign(birthTime, birthDate) {
  // Return null to indicate that rising sign calculation should be deferred to oracle
  // The oracle has access to more accurate astrological data and ephemeris calculations
  return null;
}
