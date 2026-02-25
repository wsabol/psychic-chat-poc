// Re-export the English zodiac sign data module.
// The canonical implementation lives in zodiac/translations/ — this shim
// keeps the /data root complete for all 8 supported languages.
export { zodiacSigns as default, zodiacSigns } from './zodiac/translations/en-US-module.js';
