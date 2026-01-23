/**
 * User Profile Constants
 * Validation constants for user preferences and settings
 */

export const VALID_LANGUAGES = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'es-DO', 
  'fr-FR', 'fr-CA', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'
];

export const VALID_ORACLE_LANGUAGES = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'es-DO', 'fr-FR', 'fr-CA'
];

export const VALID_RESPONSE_TYPES = ['full', 'brief'];

export const VALID_VOICES = ['sophia', 'cassandra', 'meridian', 'leo'];

export const DEFAULT_PREFERENCES = {
  language: 'en-US',
  response_type: 'full',
  voice_enabled: true,
  voice_selected: 'sophia',
  timezone: null,
  oracle_language: 'en-US'
};
