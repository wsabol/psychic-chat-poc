/**
 * Maps oracle language variants to their base page languages
 * Used to ensure page translations work correctly
 * 
 * Oracle Language → Base Page Language
 * en-GB → en-US (both English)
 * es-MX, es-DO → es-ES (all Spanish)
 * fr-CA → fr-FR (both French)
 */

export const oracleLanguageMap = {
  'en-US': 'en-US',
  'en-GB': 'en-US',
  'es-ES': 'es-ES',
  'es-MX': 'es-ES',
  'es-DO': 'es-ES',
  'fr-FR': 'fr-FR',
  'fr-CA': 'fr-FR',
};

/**
 * Get the base page language for an oracle language variant
 * @param {string} oracleLanguage - The oracle language code (e.g., 'es-MX')
 * @returns {string} The base page language (e.g., 'es-ES')
 */
export function getBaseLanguageForOracle(oracleLanguage) {
  return oracleLanguageMap[oracleLanguage] || 'en-US';
}

/**
 * Get valid oracle languages for a given base page language
 * @param {string} baseLanguage - The base page language (e.g., 'es-ES')
 * @returns {Array} Array of valid oracle language codes
 */
export function getOracleVariantsForBase(baseLanguage) {
  return Object.entries(oracleLanguageMap)
    .filter(([_, base]) => base === baseLanguage)
    .map(([oracle]) => oracle);
}
