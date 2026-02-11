/**
 * Legal Document Utilities
 * 
 * Provides functions to get the correct legal document paths based on user's language preference
 * Falls back to English (en-US) if the language is not available
 */

/**
 * Map of available languages for legal documents
 * Based on files in client/public/
 */
const AVAILABLE_LEGAL_LANGUAGES = {
  'en-US': 'en-US',
  'es-ES': 'es',
  'fr-FR': 'fr'
};

/**
 * Default language for legal documents
 */
const DEFAULT_LEGAL_LANGUAGE = 'en-US';

/**
 * Get the appropriate legal document path based on language
 * @param {string} docType - 'terms' or 'privacy'
 * @param {string} language - Current user language (e.g., 'en-US', 'es-ES', 'fr-FR')
 * @returns {string} Path to the PDF file (e.g., '/Terms_of_Service-en-US.pdf')
 */
export function getLegalDocumentPath(docType, language) {
  // Normalize docType
  const normalizedDocType = docType?.toLowerCase() === 'privacy' ? 'privacy' : 'terms';
  
  // Get the language suffix for the file
  const langSuffix = AVAILABLE_LEGAL_LANGUAGES[language] || DEFAULT_LEGAL_LANGUAGE;
  
  // Construct the file path
  if (normalizedDocType === 'privacy') {
    return `/privacy-${langSuffix}.pdf`;
  } else {
    return `/Terms_of_Service-${langSuffix}.pdf`;
  }
}

/**
 * Check if a legal document is available in the specified language
 * @param {string} language - Language code (e.g., 'en-US', 'es-ES')
 * @returns {boolean} True if available, false otherwise
 */
export function isLegalDocumentAvailable(language) {
  return language in AVAILABLE_LEGAL_LANGUAGES;
}

/**
 * Get list of available languages for legal documents
 * @returns {Array<string>} Array of language codes
 */
export function getAvailableLegalLanguages() {
  return Object.keys(AVAILABLE_LEGAL_LANGUAGES);
}

/**
 * Get the language suffix used in the filename
 * @param {string} language - Language code (e.g., 'en-US', 'es-ES')
 * @returns {string} Language suffix for filename (e.g., 'en-US', 'es', 'fr')
 */
export function getLegalDocumentLanguageSuffix(language) {
  return AVAILABLE_LEGAL_LANGUAGES[language] || DEFAULT_LEGAL_LANGUAGE;
}
