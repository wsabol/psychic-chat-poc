import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// English modular translations
import enUSAuth from '../translations/en-US-auth.json';
import enUSUI from '../translations/en-US-ui.json';
import enUSPages from '../translations/en-US-pages.json';
import enUSSettings from '../translations/en-US-settings.json';
import enUSLegal from '../translations/en-US-legal.json';
import enUSAstrology from '../translations/en-US-astrology.json';
import enUSBilling from '../translations/en-US-billing.json';
import enUSHints from '../translations/en-US-hints.json';
import enUSHelp from '../translations/en-US-help.json';
import enUSWelcome from '../translations/en-US-welcome.json';
import enUSZodiacWheel from '../translations/en-US-zodiacwheel.json';

// Spanish modular translations
import esESAuth from '../translations/es-ES-auth.json';
import esESUI from '../translations/es-ES-ui.json';
import esESPages from '../translations/es-ES-pages.json';
import esESSettings from '../translations/es-ES-settings.json';
import esESLegal from '../translations/es-ES-legal.json';
import esESAstrology from '../translations/es-ES-astrology.json';
import esESBilling from '../translations/es-ES-billing.json';
import esESHints from '../translations/es-ES-hints.json';
import esESHelp from '../translations/es-ES-help.json';
import esESWelcome from '../translations/es-ES-welcome.json';
import esESZodiacWheel from '../translations/es-ES-zodiacwheel.json';

// French modular translations
import frFRAuth from '../translations/fr-FR-auth.json';
import frFRUI from '../translations/fr-FR-ui.json';
import frFRPages from '../translations/fr-FR-pages.json';
import frFRSettings from '../translations/fr-FR-settings.json';
import frFRLegal from '../translations/fr-FR-legal.json';
import frFRAstrology from '../translations/fr-FR-astrology.json';
import frFRBilling from '../translations/fr-FR-billing.json';
import frFRHints from '../translations/fr-FR-hints.json';
import frFRHelp from '../translations/fr-FR-help.json';
import frFRWelcome from '../translations/fr-FR-welcome.json';
import frFRZodiacWheel from '../translations/fr-FR-zodiacwheel.json';

// German modular translations
import deDEAuth from '../translations/de-DE-auth.json';
import deDEUI from '../translations/de-DE-ui.json';
import deDEPages from '../translations/de-DE-pages.json';
import deDESettings from '../translations/de-DE-settings.json';
import deDELegal from '../translations/de-DE-legal.json';
import deDEAstrology from '../translations/de-DE-astrology.json';
import deDEBilling from '../translations/de-DE-billing.json';
import deDEHints from '../translations/de-DE-hints.json';
import deDEHelp from '../translations/de-DE-help.json';
import deDEWelcome from '../translations/de-DE-welcome.json';
import deDEZodiacWheel from '../translations/de-DE-zodiacwheel.json';

// Italian modular translations
import itITAuth from '../translations/it-IT-auth.json';
import itITUI from '../translations/it-IT-ui.json';
import itITPages from '../translations/it-IT-pages.json';
import itITSettings from '../translations/it-IT-settings.json';
import itITLegal from '../translations/it-IT-legal.json';
import itITAstrology from '../translations/it-IT-astrology.json';
import itITBilling from '../translations/it-IT-billing.json';
import itITHints from '../translations/it-IT-hints.json';
import itITHelp from '../translations/it-IT-help.json';
import itITWelcome from '../translations/it-IT-welcome.json';
import itITZodiacWheel from '../translations/it-IT-zodiacwheel.json';

// Portuguese modular translations
import ptBRAuth from '../translations/pt-BR-auth.json';
import ptBRUI from '../translations/pt-BR-ui.json';
import ptBRPages from '../translations/pt-BR-pages.json';
import ptBRSettings from '../translations/pt-BR-settings.json';
import ptBRLegal from '../translations/pt-BR-legal.json';
import ptBRAstrology from '../translations/pt-BR-astrology.json';
import ptBRBilling from '../translations/pt-BR-billing.json';
import ptBRHints from '../translations/pt-BR-hints.json';
import ptBRHelp from '../translations/pt-BR-help.json';
import ptBRWelcome from '../translations/pt-BR-welcome.json';
import ptBRZodiacWheel from '../translations/pt-BR-zodiacwheel.json';

// Japanese modular translations
import jaJPAuth from '../translations/ja-JP-auth.json';
import jaJPUI from '../translations/ja-JP-ui.json';
import jaJPPages from '../translations/ja-JP-pages.json';
import jaJPSettings from '../translations/ja-JP-settings.json';
import jaJPLegal from '../translations/ja-JP-legal.json';
import jaJPAstrology from '../translations/ja-JP-astrology.json';
import jaJPBilling from '../translations/ja-JP-billing.json';
import jaJPHints from '../translations/ja-JP-hints.json';
import jaJPHelp from '../translations/ja-JP-help.json';
import jaJPWelcome from '../translations/ja-JP-welcome.json';
import jaJPZodiacWheel from '../translations/ja-JP-zodiacwheel.json';

// Chinese modular translations
import zhCNAuth from '../translations/zh-CN-auth.json';
import zhCNUI from '../translations/zh-CN-ui.json';
import zhCNPages from '../translations/zh-CN-pages.json';
import zhCNSettings from '../translations/zh-CN-settings.json';
import zhCNLegal from '../translations/zh-CN-legal.json';
import zhCNAstrology from '../translations/zh-CN-astrology.json';
import zhCNBilling from '../translations/zh-CN-billing.json';
import zhCNHints from '../translations/zh-CN-hints.json';
import zhCNHelp from '../translations/zh-CN-help.json';
import zhCNWelcome from '../translations/zh-CN-welcome.json';
import zhCNZodiacWheel from '../translations/zh-CN-zodiacwheel.json';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const TranslationContext = createContext();

/**
 * Deep merge multiple translation objects into one
 * Later properties override earlier ones, but nested objects are merged
 */
function mergeTranslations(...objects) {
  function deepMerge(target, source) {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      // If both are plain objects (not arrays, not null), merge recursively
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Otherwise, source overrides target
        result[key] = sourceValue;
      }
    });
    
    return result;
  }
  
  return objects.reduce((acc, obj) => {
    if (!obj) return acc;
    return deepMerge(acc, obj);
  }, {});
}

// English uses modular structure: merge auth + ui + pages + settings + legal + astrology + billing + hints + help + welcome + zodiacwheel
const enUS = mergeTranslations(enUSAuth, enUSUI, enUSPages, enUSSettings, enUSLegal, enUSAstrology, enUSBilling, enUSHints, enUSHelp, enUSWelcome, enUSZodiacWheel);

const esES = mergeTranslations(esESAuth, esESUI, esESPages, esESSettings, esESLegal, esESAstrology, esESBilling, esESHints, esESHelp, esESWelcome, esESZodiacWheel);
const frFR = mergeTranslations(frFRAuth, frFRUI, frFRPages, frFRSettings, frFRLegal, frFRAstrology, frFRBilling, frFRHints, frFRHelp, frFRWelcome, frFRZodiacWheel);
const deDE = mergeTranslations(deDEAuth, deDEUI, deDEPages, deDESettings, deDELegal, deDEAstrology, deDEBilling, deDEHints, deDEHelp, deDEWelcome, deDEZodiacWheel);
const itIT = mergeTranslations(itITAuth, itITUI, itITPages, itITSettings, itITLegal, itITAstrology, itITBilling, itITHints, itITHelp, itITWelcome, itITZodiacWheel);
const ptBR = mergeTranslations(ptBRAuth, ptBRUI, ptBRPages, ptBRSettings, ptBRLegal, ptBRAstrology, ptBRBilling, ptBRHints, ptBRHelp, ptBRWelcome, ptBRZodiacWheel);
const jaJP = mergeTranslations(jaJPAuth, jaJPUI, jaJPPages, jaJPSettings, jaJPLegal, jaJPAstrology, jaJPBilling, jaJPHints, jaJPHelp, jaJPWelcome, jaJPZodiacWheel);
const zhCN = mergeTranslations(zhCNAuth, zhCNUI, zhCNPages, zhCNSettings, zhCNLegal, zhCNAstrology, zhCNBilling, zhCNHints, zhCNHelp, zhCNWelcome, zhCNZodiacWheel);

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

export function TranslationProvider({ children, userLanguageFromDB }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [translations, setTranslations] = useState(LANGUAGES[DEFAULT_LANGUAGE].translations);

  useEffect(() => {
    const initializeLanguage = () => {
      let selectedLanguage = DEFAULT_LANGUAGE;

      if (userLanguageFromDB && LANGUAGES[userLanguageFromDB]) {
        selectedLanguage = userLanguageFromDB;
      } else {
        const savedLanguage = localStorage.getItem(STORAGE_KEY);
        if (savedLanguage && LANGUAGES[savedLanguage]) {
          selectedLanguage = savedLanguage;
        } else {
          const browserLang = navigator.language || navigator.userLanguage;
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

  const changeLanguage = useCallback(async (newLanguage) => {
    if (!LANGUAGES[newLanguage]) {
      logErrorFromCatch(`Language ${newLanguage} not supported`);
      return false;
    }

    setLanguage(newLanguage);
    setTranslations(LANGUAGES[newLanguage].translations);
    localStorage.setItem(STORAGE_KEY, newLanguage);

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

  const t = (key, variables = {}) => {
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        return key;
      }
    }

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

