/**
 * Oracle Language Mapping Utility
 * Maps oracle language variants to their base page language
 * 
 * Example:
 * User selects oracle_language: 'es-419'
 * Maps to page language: 'es-ES'
 * Oracle gets 'es-419' for responses, UI renders in 'es-ES'
 */

export const oracleLanguageMap = {
    // English variants
    'en-US': 'en-US',   // Oracle English (US) → Page English (US)
    'en-GB': 'en-US',   // Oracle English (British) → Page English (US)
    
    // Spanish variants
    'es-ES':  'es-ES',  // Oracle Spanish (Spain) → Page Spanish (ES)
    'es-419': 'es-ES',  // Oracle Spanish (Latin America) → Page Spanish (ES)
    'es-US':  'es-ES',  // Oracle Spanish (US) → Page Spanish (ES)
    
    // French variants
    'fr-FR': 'fr-FR',   // Oracle French (France) → Page French (FR)
    'fr-CA': 'fr-FR',   // Oracle French (Canada) → Page French (FR)
    
    // Fallback defaults
    'de-DE': 'en-US',   // German → English (no German page translation yet)
    'it-IT': 'en-US',   // Italian → English (no Italian page translation yet)
    'pt-BR': 'en-US',   // Portuguese → English (no Portuguese page translation yet)
    'ja-JP': 'en-US',   // Japanese → English (no Japanese page translation yet)
    'zh-CN': 'en-US'    // Chinese → English (no Chinese page translation yet)
};

/**
 * Get base page language from oracle language selection
 * @param {string} oracleLanguage - The oracle language code (e.g., 'es-419', 'en-GB')
 * @returns {string} Base page language code (e.g., 'es-ES', 'en-US')
 */
export function getBaseLanguageFromOracleLanguage(oracleLanguage) {
    const baseLanguage = oracleLanguageMap[oracleLanguage];
    
    if (!baseLanguage) {
        return 'en-US';
    }
    
    return baseLanguage;
}

/**
 * Get all available oracle languages grouped by base language
 * Used for building frontend dropdown menus
 * @returns {object} Grouped oracle languages
 */
export function getOracleLanguagesByBase() {
    return {
        'en-US': [
            { code: 'en-US', label: 'English (United States)' },
            { code: 'en-GB', label: 'English (British)' }
        ],
        'es-ES': [
            { code: 'es-ES',  label: 'Español (España)' },
            { code: 'es-419', label: 'Español (Latinoamérica)' },
            { code: 'es-US',  label: 'Español (EE. UU.)' }
        ],
        'fr-FR': [
            { code: 'fr-FR', label: 'Français (France)' },
            { code: 'fr-CA', label: 'Français (Canada)' }
        ]
    };
}

