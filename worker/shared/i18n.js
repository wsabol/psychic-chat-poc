/**
 * i18n setup for worker
 * Provides translation support for violation detection and responses
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported languages
export const SUPPORTED_LANGUAGES = ['en-US', 'es-ES', 'de-DE', 'fr-FR', 'it-IT', 'ja-JP', 'pt-BR', 'zh-CN'];

// Translation cache
const translationCache = {};

/**
 * Load translation file
 */
function loadTranslation(language, namespace) {
  const cacheKey = `${language}-${namespace}`;
  
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    const translationPath = path.join(__dirname, '../translations', `${language}-${namespace}.json`);
    const data = fs.readFileSync(translationPath, 'utf8');
    translationCache[cacheKey] = JSON.parse(data);
    return translationCache[cacheKey];
  } catch (err) {
    // Fallback to English
    if (language !== 'en-US') {
      return loadTranslation('en-US', namespace);
    }
    console.error(`Failed to load translation ${language}-${namespace}:`, err);
    return {};
  }
}

/**
 * Get translation function for a specific language
 */
export function getTranslator(language = 'en-US', namespace = 'violations') {
  // Normalize language code
  const normalizedLang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en-US';
  
  return function t(key, params = {}) {
    const translations = loadTranslation(normalizedLang, namespace);
    
    // Navigate nested keys (e.g., "responses.sexual_content")
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
    
    // If not found, try English fallback
    if (value === undefined && normalizedLang !== 'en-US') {
      const fallbackTranslations = loadTranslation('en-US', namespace);
      value = fallbackTranslations;
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          value = key; // Return key if not found
          break;
        }
      }
    }
    
    // Replace parameters
    if (typeof value === 'string' && params) {
      Object.keys(params).forEach(param => {
        value = value.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      });
    }
    
    return value || key;
  };
}

/**
 * Get all keywords for violation detection across all languages
 */
export function getAllViolationKeywords(violationType) {
  const keywords = [];
  
  for (const language of SUPPORTED_LANGUAGES) {
    const translations = loadTranslation(language, 'violations-detection');
    const typeKeywords = translations.keywords?.[violationType];
    
    if (Array.isArray(typeKeywords)) {
      keywords.push(...typeKeywords);
    }
  }
  
  // Remove duplicates and return
  return [...new Set(keywords)];
}

/**
 * Clear translation cache (useful for hot reload in development)
 */
export function clearTranslationCache() {
  Object.keys(translationCache).forEach(key => delete translationCache[key]);
}
