/**
 * Date Localization Utilities
 * Converts language codes to proper locale codes for date formatting
 */

// Map language codes to browser locale codes
const LANGUAGE_TO_LOCALE = {
  'en-US': 'en-US',
  'es-ES': 'es-ES',
  'fr-FR': 'fr-FR',
  'de-DE': 'de-DE',
  'it-IT': 'it-IT',
  'pt-BR': 'pt-BR',
  'ja-JP': 'ja-JP',
  'zh-CN': 'zh-CN'
};

/**
 * Get the appropriate locale string for a language code
 * @param {string} language - Language code (e.g., 'es-ES', 'fr-FR')
 * @returns {string} Locale code for toLocaleDateString()
 */
export function getLocaleFromLanguage(language) {
  return LANGUAGE_TO_LOCALE[language] || 'en-US';
}

/**
 * Format a date according to the user's language preference
 * @param {Date|number|string} date - Date to format
 * @param {string} language - Language code (e.g., 'es-ES')
 * @param {object} options - toLocaleDateString options
 * @returns {string} Formatted date string
 */
export function formatDateByLanguage(date, language, options = {}) {
  const locale = getLocaleFromLanguage(language);
  const defaultOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  return new Date(date).toLocaleDateString(locale, defaultOptions);
}

/**
 * Format just the date part (no weekday)
 * @param {Date|number|string} date - Date to format
 * @param {string} language - Language code
 * @returns {string} Formatted date string
 */
export function formatDateOnlyByLanguage(date, language) {
  const locale = getLocaleFromLanguage(language);
  return new Date(date).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format date with short month (e.g., "Jan 15, 2026")
 * @param {Date|number|string} date - Date to format
 * @param {string} language - Language code
 * @returns {string} Formatted date string
 */
export function formatDateShortByLanguage(date, language) {
  const locale = getLocaleFromLanguage(language);
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
