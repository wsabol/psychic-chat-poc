import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// English translations (base language - keep as reference)
import enUS from '../translations/en-US.json';

// Spanish modular translations
import esESCore from '../translations/es-ES-core.json';
import esESAstrology from '../translations/es-ES-astrology.json';
import esESBilling from '../translations/es-ES-billing.json';

// French modular translations
import frFRCore from '../translations/fr-FR-core.json';
import frFRAstrology from '../translations/fr-FR-astrology.json';
import frFRBilling from '../translations/fr-FR-billing.json';

// Other languages (full files for now, can modularize later)
import deDE from '../translations/de-DE.json';
import itIT from '../translations/it-IT.json';
import ptBR from '../translations/pt-BR.json';
import jaJP from '../translations/ja-JP.json';
import zhCN from '../translations/zh-CN.json';

const TranslationContext = createContext();

/**
 * Merge multiple translation objects into one
 * Later properties override earlier ones
 */
function mergeTranslations(...objects) {
  return objects.reduce((acc, obj) => {
    if (!obj) return acc;
    return { ...acc, ...obj };
  }, {});
}

// Spanish is modular - merge all parts
const esES = mergeTranslations(esESCore, esESAstrology, esESBilling);

// French is modular - merge all parts
const frFR = mergeTranslations(frFRCore, frFRAstrology, frFRBilling);

// All available languages
const LANGUAGES = {
  'en-US': { name: 'English', flag: '🇺🇸', translations: enUS },
  'es-ES': { name: 'Español', flag: '🇪🇸', translations: esES },
  'fr-FR': { name: 'Français', flag: '🇫🇷', translations: frFR },
  'de-DE': { name: 'Deutsch', flag: '🇩🇪', translations: deDE },
  'it-IT': { name: 'Italiano', flag: '🇮🇹', translations: itIT },
  'pt-BR': { name: 'Português', flag: '🇧🇷', translations: ptBR },
  'ja-JP': { name: '日本語', flag: '🇯🇵', translations: jaJP },
  'zh-CN': { name: '中文', flag: '🇨🇳', translations: zhCN }
};

const DEFAULT_LANGUAGE = 'en-US';
const STORAGE_KEY = 'preferredLanguage';

/**
 * TranslationProvider - Manages language selection and translation state
 * 
 * Flow:
 * 1. Check localStorage for saved language
 * 2. Check browser language preference
 * 3. If user authenticated, fetch from DB
 * 4. Cache translations in state (no repeated loads)
 * 5. Persist selection to localStorage and DB
 */
export function TranslationProvider({ children, userLanguageFromDB }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [translations, setTranslations] = useState(LANGUAGES[DEFAULT_LANGUAGE].translations);

  // Initialize language on mount
  useEffect(() => {
    const initializeLanguage = () => {
      // Priority: DB preference > localStorage > browser language > default
      let selectedLanguage = DEFAULT_LANGUAGE;

      // 1. Check if user has DB preference
      if (userLanguageFromDB && LANGUAGES[userLanguageFromDB]) {
        selectedLanguage = userLanguageFromDB;
      } 
      // 2. Check localStorage (offline/temp users)
      else {
        const savedLanguage = localStorage.getItem(STORAGE_KEY);
        if (savedLanguage && LANGUAGES[savedLanguage]) {
          selectedLanguage = savedLanguage;
        } 
        // 3. Try to detect browser language
        else {
          const browserLang = navigator.language || navigator.userLanguage;
          // Try to find a match in our languages (e.g., 'es' matches 'es-ES')
          const matchedLang = Object.keys(LANGUAGES).find(lang => 
            lang.startsWith(browserLang.split('-')[0])
          );
          if (matchedLang) {
            selectedLanguage = matchedLang;
          }
        }
      }

      setLanguage(selectedLanguage);
      setTranslations(LANGUAGES[selectedLanguage].translations);
      localStorage.setItem(STORAGE_KEY, selectedLanguage);
      setIsLoading(false);
    };

    initializeLanguage();
  }, [userLanguageFromDB]);

  // Change language handler
  const changeLanguage = useCallback(async (newLanguage) => {
    if (!LANGUAGES[newLanguage]) {
      console.error(`Language ${newLanguage} not supported`);
      return false;
    }

    setLanguage(newLanguage);
    setTranslations(LANGUAGES[newLanguage].translations);
    localStorage.setItem(STORAGE_KEY, newLanguage);

    // If user is authenticated, save to DB (fire and forget)
    // This will be called by the hook that has access to the userId
    return true;
  }, []);

  const value = {
    language,
    translations,
    changeLanguage,
    isLoading,
    availableLanguages: LANGUAGES
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }

  const { translations, language, changeLanguage, isLoading, availableLanguages } = context;

  /**
   * Get translated text by key path
   * Example: t('landing.title') or t('common.loading')
   * Supports {{variable}} replacement: t('verification.message', { email: 'user@example.com' })
   */
  const t = (key, variables = {}) => {
    const keys = key.split('.');
    let value = translations;

    // Navigate through nested object
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    // Replace variables in template strings
    if (typeof value === 'string' && Object.keys(variables).length > 0) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] ?? match;
      });
    }

    return value;
  };

  return {
    t,
    language,
    changeLanguage,
    isLoading,
    availableLanguages
  };
}
