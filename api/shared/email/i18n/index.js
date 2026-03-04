/**
 * Email i18n resolver
 *
 * Loads locale string catalogs once at module startup (zero per-email overhead).
 * Falls back to en-US for any missing locale or missing key.
 *
 * Usage:
 *   import { getEmailStrings, t } from '../i18n/index.js';
 *   const s = getEmailStrings(locale).twoFactor;
 *   html = `<h2>${s.heading}</h2>${t(s.expiry, { expiryMinutes: 10 })}`;
 */

import enUS from './en-US.js';
import deDE from './de-DE.js';
import esES from './es-ES.js';
import frFR from './fr-FR.js';
import itIT from './it-IT.js';
import jaJP from './ja-JP.js';
import ptBR from './pt-BR.js';
import zhCN from './zh-CN.js';

// ─── Registry ────────────────────────────────────────────────────────────────
// Add new locales here — no other file needs to change.
const LOCALES = {
  'en-US': enUS,
  'de-DE': deDE,
  'es-ES': esES,
  'fr-FR': frFR,
  'it-IT': itIT,
  'ja-JP': jaJP,
  'pt-BR': ptBR,
  'zh-CN': zhCN,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Return the full string catalog for the given locale.
 * Falls back to en-US if the locale is unknown or not yet translated.
 *
 * @param {string} [locale='en-US']
 * @returns {Object} Full locale string catalog
 */
export function getEmailStrings(locale = 'en-US') {
  return LOCALES[locale] ?? LOCALES['en-US'];
}

/**
 * Get strings for a specific email section, with automatic en-US fallback
 * for any missing section keys in partial translations.
 *
 * @param {string} [locale='en-US']
 * @param {string} section  - Top-level key, e.g. 'twoFactor', 'policyChange'
 * @returns {Object} Section strings
 */
export function getEmailSection(locale = 'en-US', section) {
  const localeStrings = getEmailStrings(locale);
  // If the section is missing entirely (incomplete translation), fall back to en-US
  return localeStrings[section] ?? LOCALES['en-US'][section] ?? {};
}

/**
 * Simple `{variable}` interpolation — no external deps, no eval.
 * Variables not found in `vars` are left as-is (e.g. `{missing}`).
 *
 * @param {string} template  - String with `{varName}` placeholders
 * @param {Object} [vars={}] - Values to substitute
 * @returns {string}
 */
export function t(template, vars = {}) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? vars[key] : `{${key}}`
  );
}

/**
 * Normalize a locale code to one we support, falling back to 'en-US'.
 * Accepts full codes ('es-ES') or short codes ('es').
 *
 * @param {string} [locale]
 * @returns {string} Supported locale code
 */
export function resolveLocale(locale) {
  if (!locale) return 'en-US';
  if (LOCALES[locale]) return locale;
  // Try matching by language prefix (e.g. 'es' → 'es-ES')
  const prefix = locale.split('-')[0].toLowerCase();
  const match = Object.keys(LOCALES).find(k => k.toLowerCase().startsWith(prefix));
  return match ?? 'en-US';
}

/**
 * Extract and resolve a locale from an Express request object.
 *
 * Priority (highest → lowest):
 *   1. x-app-locale header  — set by the client app for explicit language choice
 *   2. Accept-Language header — browser / native HTTP default
 *   3. 'en-US' fallback
 *
 * The resolved code is guaranteed to be a key in LOCALES (with en-US fallback).
 *
 * @param {import('express').Request} [req]
 * @returns {string} Resolved locale code, e.g. 'es-ES'
 */
export function resolveLocaleFromRequest(req) {
  // 1. Explicit app-level header (client sets this from its own i18n state)
  const explicit = req?.headers?.['x-app-locale'];
  if (explicit) return resolveLocale(explicit.trim());

  // 2. HTTP Accept-Language  (e.g. "es-ES,es;q=0.9,en;q=0.8")
  const acceptLang = req?.headers?.['accept-language'];
  if (acceptLang) {
    const primary = acceptLang.split(',')[0].trim().split(';')[0].trim();
    if (primary) return resolveLocale(primary);
  }

  return 'en-US';
}

export default { getEmailStrings, getEmailSection, t, resolveLocale, resolveLocaleFromRequest };
