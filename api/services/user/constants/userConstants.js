/**
 * User Profile Constants
 * Validation constants for user preferences and settings
 */

export const VALID_LANGUAGES = [
  'en-US', 'en-GB', 'es-ES', 'es-419', 'es-US',
  'fr-FR', 'fr-CA', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'
];

export const VALID_ORACLE_LANGUAGES = [
  'en-US', 'en-GB', 'es-ES', 'es-419', 'es-US', 'fr-FR', 'fr-CA',
  'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'
];

export const VALID_RESPONSE_TYPES = ['full', 'brief'];

export const VALID_VOICES = ['sophia', 'cassandra', 'meridian', 'leo'];

/**
 * Oracle Character (Persona) constants
 * Controls the personality and tone of the oracle's responses
 */
export const VALID_ORACLE_CHARACTERS = [
  'sage',           // The Sage — warm, direct elder wisdom (DEFAULT)
  'mystic_oracle',  // The Mystic Oracle — deeply poetic, full tarot/astrology/crystals
  'star_guide',     // The Star Guide — friendly astrology coach, plain language
  'card_reader',    // The Card Reader — no-nonsense tarot practitioner
  'cosmic_advisor'  // The Cosmic Advisor — grounded life coach, least mystical
];

export const DEFAULT_ORACLE_CHARACTER = 'sage';

export const DEFAULT_PREFERENCES = {
  language: 'en-US',
  response_type: 'full',
  voice_enabled: true,
  voice_selected: 'sophia',
  timezone: null,
  oracle_language: 'en-US',
  oracle_character: 'sage'
};
