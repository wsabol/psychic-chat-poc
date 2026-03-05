/**
 * Global Currency & Payment Method Mapping
 *
 * Maps ISO 3166-1 alpha-2 country codes to:
 *  - ISO 4217 currency codes
 *  - Stripe-supported recurring payment method types
 *
 * Recurring-capable payment methods (safe for subscriptions):
 *   card           — global
 *   sepa_debit     — EU / SEPA-zone countries (EUR, SEK, DKK, NOK, PLN, CZK, HUF, RON, BGN, CHF)
 *   bacs_debit     — United Kingdom (GBP)
 *   us_bank_account — United States (USD, ACH)
 *   acss_debit     — Canada (CAD, pre-authorised debit)
 *
 * NOTE: PIX and Boleto are one-time payment methods and are NOT supported for
 * recurring subscriptions. Brazilian customers pay by card in BRL.
 */

// ---------------------------------------------------------------------------
// Country → Currency
// ---------------------------------------------------------------------------
const COUNTRY_CURRENCY_MAP = {
  // North America
  US: 'usd', CA: 'cad', MX: 'mxn',

  // Central America & Caribbean
  GT: 'gtq', CR: 'crc', PA: 'usd', // Panama uses USD
  CU: 'cup', JM: 'jmd', DO: 'dop', HT: 'htg', TT: 'ttd',
  HN: 'hnl', NI: 'nio', SV: 'usd', // El Salvador uses USD
  BZ: 'bzd', BB: 'bbd', BS: 'bsd',

  // South America
  BR: 'brl', AR: 'ars', CL: 'clp', CO: 'cop', PE: 'pen',
  UY: 'uyu', PY: 'pyg', BO: 'bob',
  EC: 'usd', // Ecuador uses USD
  VE: 'ves', GY: 'gyd', SR: 'srd',

  // Western Europe — EUR
  DE: 'eur', FR: 'eur', IT: 'eur', ES: 'eur', NL: 'eur',
  BE: 'eur', AT: 'eur', PT: 'eur', IE: 'eur', FI: 'eur',
  GR: 'eur', SK: 'eur', SI: 'eur', EE: 'eur', LV: 'eur',
  LT: 'eur', LU: 'eur', MT: 'eur', CY: 'eur', HR: 'eur', // Croatia → EUR 2023

  // Non-EUR Europe
  GB: 'gbp', CH: 'chf', NO: 'nok', SE: 'sek', DK: 'dkk',
  PL: 'pln', CZ: 'czk', HU: 'huf', RO: 'ron', BG: 'bgn',
  RS: 'rsd', IS: 'isk', UA: 'uah', BY: 'byn', GE: 'gel',
  MD: 'mdl', AL: 'all', MK: 'mkd', BA: 'bam', ME: 'eur',

  // Asia-Pacific
  AU: 'aud', NZ: 'nzd', JP: 'jpy',
  CN: 'cny', HK: 'hkd', TW: 'twd', KR: 'krw',
  SG: 'sgd', IN: 'inr', ID: 'idr', MY: 'myr', TH: 'thb',
  PH: 'php', VN: 'vnd', PK: 'pkr', BD: 'bdt', LK: 'lkr',
  NP: 'npr', MM: 'mmk', KH: 'khr', LA: 'lak',

  // Middle East
  AE: 'aed', SA: 'sar', QA: 'qar', KW: 'kwd', BH: 'bhd',
  OM: 'omr', IL: 'ils', TR: 'try', JO: 'jod', EG: 'egp',
  LB: 'lbp', IQ: 'iqd', IR: 'irr',

  // Africa
  ZA: 'zar', NG: 'ngn', KE: 'kes', GH: 'ghs', TZ: 'tzs',
  UG: 'ugx', ET: 'etb', RW: 'rwf', TN: 'tnd', MA: 'mad',
  DZ: 'dzd', SN: 'xof', CI: 'xof', CM: 'xaf', ZM: 'zmw',
  ZW: 'usd', // Zimbabwe uses USD
  MZ: 'mzn', AO: 'aoa', MU: 'mur',
};

// ---------------------------------------------------------------------------
// Country → additional recurring payment methods (beyond 'card')
// ---------------------------------------------------------------------------
// SEPA zone (includes EU + CH, NO, SE, DK, PL, CZ, HU, RO, BG)
const SEPA_COUNTRIES = new Set([
  'DE','FR','IT','ES','NL','BE','AT','PT','IE','FI','GR','SK','SI',
  'EE','LV','LT','LU','MT','CY','HR', // EUR eurozone
  'SE','DK','NO','PL','CZ','HU','RO','BG','CH', // SEPA non-EUR
]);

const COUNTRY_EXTRA_PAYMENT_METHODS = {
  GB: ['bacs_debit'],
  US: ['us_bank_account'],
  CA: ['acss_debit'],
};

// SEPA countries all get sepa_debit
for (const code of SEPA_COUNTRIES) {
  COUNTRY_EXTRA_PAYMENT_METHODS[code] = ['sepa_debit'];
}

// ---------------------------------------------------------------------------
// Supported currencies for multi-currency pricing
// (Stripe-supported AND large enough market to warrant localisation)
// ---------------------------------------------------------------------------
export const SUPPORTED_CURRENCIES = new Set([
  // Major reserve currencies
  'usd', 'eur', 'gbp', 'jpy', 'chf',
  // Anglophone
  'cad', 'aud', 'nzd',
  // European non-EUR
  'sek', 'nok', 'dkk', 'pln', 'czk', 'huf', 'ron', 'bgn',
  // Latin America
  'brl', 'mxn', 'clp', 'cop', 'pen', 'ars', 'uyu',
  // Asia-Pacific
  'inr', 'sgd', 'hkd', 'myr', 'thb', 'php', 'idr', 'krw', 'twd', 'vnd',
  // Middle East / Africa
  'try', 'zar', 'ngn', 'aed', 'ils', 'sar', 'egp', 'kes',
]);

const FALLBACK_CURRENCY = 'usd';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the ISO 4217 currency code for a country.
 * Falls back to USD for unknown or unsupported currencies.
 * @param {string|null|undefined} countryCode - ISO 3166-1 alpha-2 (e.g. 'BR')
 * @returns {string} lowercase ISO 4217 currency code (e.g. 'brl')
 */
export function getCurrencyForCountry(countryCode) {
  if (!countryCode) return FALLBACK_CURRENCY;
  const currency = COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()];
  return currency && SUPPORTED_CURRENCIES.has(currency) ? currency : FALLBACK_CURRENCY;
}

/**
 * Return Stripe payment-method types for a country.
 * Always includes 'card'. Adds local recurring methods where supported.
 * @param {string|null|undefined} countryCode - ISO 3166-1 alpha-2
 * @returns {string[]} e.g. ['card', 'sepa_debit']
 */
export function getPaymentMethodsForCountry(countryCode) {
  const extra = COUNTRY_EXTRA_PAYMENT_METHODS[countryCode?.toUpperCase()] ?? [];
  return ['card', ...extra];
}

/**
 * Check whether a currency code is in the supported multi-currency set.
 * @param {string} currency - ISO 4217 code (case-insensitive)
 * @returns {boolean}
 */
export function isSupportedCurrency(currency) {
  return SUPPORTED_CURRENCIES.has(currency?.toLowerCase());
}
