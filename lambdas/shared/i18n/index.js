/**
 * Lambda i18n shim — Email string resolver
 *
 * This is a thin re-export of the API's canonical email i18n module.
 * ALL locale string catalogs live in api/shared/email/i18n/.
 *
 * Adding a new language:
 *   1. Add  api/shared/email/i18n/<locale>.js   (copy en-US.js as template)
 *   2. Register it in api/shared/email/i18n/index.js  (one line)
 *   Done — this Lambda module picks it up automatically.
 *
 * During local development Node.js resolves relative imports directly.
 * When building for Lambda deployment the bundler (esbuild) follows the
 * import chain and includes all referenced locale files in the bundle.
 */

export {
  getEmailStrings,
  getEmailSection,
  t,
  resolveLocale,
  resolveLocaleFromRequest,
  default,
} from '../../../api/shared/email/i18n/index.js';
