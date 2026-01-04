import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// English modular translations
import enUSAuth from '../translations/en-US-auth.json';
import enUSUI from '../translations/en-US-ui.json';
import enUSPages from '../translations/en-US-pages.json';
import enUSSettings from '../translations/en-US-settings.json';
import enUSLegal from '../translations/en-US-legal.json';
import enUSAstrology from '../translations/en-US-astrology.json';
import enUSBilling from '../translations/en-US-billing.json';

// Spanish modular translations
import esESAuth from '../translations/es-ES-auth.json';
import esESUI from '../translations/es-ES-ui.json';
import esESPages from '../translations/es-ES-pages.json';
import esESSettings from '../translations/es-ES-settings.json';
import esESLegal from '../translations/es-ES-legal.json';
import esESAstrology from '../translations/es-ES-astrology.json';
import esESBilling from '../translations/es-ES-billing.json';

// French modular translations
import frFRAuth from '../translations/fr-FR-auth.json';
import frFRUI from '../translations/fr-FR-ui.json';
import frFRPages from '../translations/fr-FR-pages.json';
import frFRSettings from '../translations/fr-FR-settings.json';
import frFRLegal from '../translations/fr-FR-legal.json';
import frFRAstrology from '../translations/fr-FR-astrology.json';
import frFRBilling from '../translations/fr-FR-billing.json';

// German modular translations
import deDEAuth from '../translations/de-DE-auth.json';
import deDEUI from '../translations/de-DE-ui.json';
import deDEPages from '../translations/de-DE-pages.json';
import deDESettings from '../translations/de-DE-settings.json';
import deDELegal from '../translations/de-DE-legal.json';
import deDEAstrology from '../translations/de-DE-astrology.json';
import deDEBilling from '../translations/de-DE-billing.json';

// Italian modular translations
import itITAuth from '../translations/it-IT-auth.json';
import itITUI from '../translations/it-IT-ui.json';
import itITPages from '../translations/it-IT-pages.json';
import itITSettings from '../translations/it-IT-settings.json';
import itITLegal from '../translations/it-IT-legal.json';
import itITAstrology from '../translations/it-IT-astrology.json';
import itITBilling from '../translations/it-IT-billing.json';

// Portuguese modular translations
import ptBRAuth from '../translations/pt-BR-auth.json';
import ptBRUI from '../translations/pt-BR-ui.json';
import ptBRPages from '../translations/pt-BR-pages.json';
import ptBRSettings from '../translations/pt-BR-settings.json';
import ptBRLegal from '../translations/pt-BR-legal.json';
import ptBRAstrology from '../translations/pt-BR-astrology.json';
import ptBRBilling from '../translations/pt-BR-billing.json';

// Japanese modular translations
import jaJPAuth from '../translations/ja-JP-auth.json';
import jaJPUI from '../translations/ja-JP-ui.json';
import jaJPPages from '../translations/ja-JP-pages.json';
import jaJPSettings from '../translations/ja-JP-settings.json';
import jaJPLegal from '../translations/ja-JP-legal.json';
import jaJPAstrology from '../translations/ja-JP-astrology.json';
import jaJPBilling from '../translations/ja-JP-billing.json';

// Chinese modular translations
import zhCNAuth from '../translations/zh-CN-auth.json';
import zhCNUI from '../translations/zh-CN-ui.json';
import zhCNPages from '../translations/zh-CN-pages.json';
import zhCNSettings from '../translations/zh-CN-settings.json';
import zhCNLegal from '../translations/zh-CN-legal.json';
import zhCNAstrology from '../translations/zh-CN-astrology.json';
import zhCNBilling from '../translations/zh-CN-billing.json';

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

// English uses modular structure: merge auth + ui + pages + settings + legal + astrology + billing
const enUS = mergeTranslations(enUSAuth, enUSUI, enUSPages, enUSSettings, enUSLegal, enUSAstrology, enUSBilling);


const esES = mergeTranslations(esESAuth, esESUI, esESPages, esESSettings, esESLegal, esESAstrology, esESBilling);
const frFR = mergeTranslations(frFRAuth, frFRUI, frFRPages, frFRSettings, frFRLegal, frFRAstrology, frFRBilling);
const deDE = mergeTranslations(deDEAuth, deDEUI, deDEPages, deDESettings, deDELegal, deDEAstrology, deDEBilling);
const itIT = mergeTranslations(itITAuth, itITUI, itITPages, itITSettings, itITLegal, itITAstrology, itITBilling);
const ptBR = mergeTranslations(ptBRAuth, ptBRUI, ptBRPages, ptBRSettings, ptBRLegal, ptBRAstrology, ptBRBilling);
const jaJP = mergeTranslations(jaJPAuth, jaJPUI, jaJPPages, jaJPSettings, jaJPLegal, jaJPAstrology, jaJPBilling);
const zhCN = mergeTranslations(zhCNAuth, zhCNUI, zhCNPages, zhCNSettings, zhCNLegal, zhCNAstrology, zhCNBilling);

// All available languages (all using modular structure)
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
