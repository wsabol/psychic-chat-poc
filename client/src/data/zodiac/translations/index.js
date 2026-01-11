// Static imports for all language modules
import enUS from './en-US-module.js';
import esES from './es-ES-module.js';
import frFR from './fr-FR-module.js';
import deDE from './de-DE-module.js';
import itIT from './it-IT-module.js';
import ptBR from './pt-BR-module.js';
import jaJP from './ja-JP-module.js';
import zhCN from './zh-CN-module.js';

export const zodiacModules = {
  'en-US': enUS,
  'es-ES': esES,
  'fr-FR': frFR,
  'de-DE': deDE,
  'it-IT': itIT,
  'pt-BR': ptBR,
  'ja-JP': jaJP,
  'zh-CN': zhCN
};

export function getZodiacModule(language) {
  return zodiacModules[language] || zodiacModules['en-US'];
}
