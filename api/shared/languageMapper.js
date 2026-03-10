/**
 * Language Mapper - Reusable across API and Worker
 * Maps oracle language variants to their friendly names for LLM instructions
 * 
 * Oracle Language → Friendly Name for LLM
 * en-US  → English (US)
 * en-GB  → English (British)
 * es-ES  → Spanish (Spain)
 * es-419 → Spanish (Latin America)
 * es-US  → Spanish (United States)
 * fr-FR  → French (France)
 * fr-CA  → French (Canadian)
 * de-DE  → German (Germany)
 * it-IT  → Italian (Italy)
 * ja-JP  → Japanese (Japan)
 * pt-BR  → Portuguese (Brazilian)
 * zh-CN  → Chinese (Simplified)
 */

export const oracleLanguageMap = {
  'en-US':  'English (US)',
  'en-GB':  'English (British)',
  'es-ES':  'Spanish (Spain)',
  'es-419': 'Spanish (Latin America)',
  'es-US':  'Spanish (United States)',
  'fr-FR':  'French (France)',
  'fr-CA':  'French (Canadian)',
  'de-DE':  'German (Germany)',
  'it-IT':  'Italian (Italy)',
  'ja-JP':  'Japanese (Japan)',
  'pt-BR':  'Portuguese (Brazilian)',
  'zh-CN':  'Chinese (Simplified)',
};

/**
 * Get the friendly language name for an oracle language code
 * @param {string} oracleLanguage - The oracle language code (e.g., 'es-419')
 * @returns {string} The friendly name (e.g., 'Spanish (Latin America)')
 */
export function getLanguageNameForOracle(oracleLanguage) {
  return oracleLanguageMap[oracleLanguage] || 'English (US)';
}

/**
 * Validate if an oracle language code is supported
 * @param {string} oracleLanguage - The oracle language code to validate
 * @returns {boolean} True if the language is supported
 */
export function isValidOracleLanguage(oracleLanguage) {
  return oracleLanguage in oracleLanguageMap;
}

/**
 * Get all supported oracle language codes
 * @returns {Array<string>} Array of all supported oracle language codes
 */
export function getAllOracleLanguages() {
  return Object.keys(oracleLanguageMap);
}
