/**
 * Price Configuration Constants
 * Central configuration for price management operations
 */

/**
 * Product configurations for different subscription intervals
 */
export const PRODUCT_CONFIGS = {
  month: {
    name: 'Monthly subscription',
    description: 'Full access with renewal each month',
    interval: 'month',
  },
  year: {
    name: 'Annual subscription',
    description: 'Full access with payments once per year',
    interval: 'year',
  },
};

/**
 * Stripe price creation defaults
 */
export const PRICE_DEFAULTS = {
  currency: 'usd',
  taxBehavior: 'exclusive', // Tax calculated separately from price
  intervalCount: 1,
  prorationBehavior: 'none', // No immediate charge, change takes effect at next billing cycle
  billingCycleAnchor: 'unchanged', // Keep the current billing date
};

/**
 * Currency multipliers relative to USD 1.00.
 * Used by createNewPrice() to populate currency_options on new Stripe prices.
 * These are market-parity / psychological-pricing suggestions — adjust freely.
 *
 * Zero-decimal currencies (JPY, KRW, VND, CLP, etc.) are stored as integers
 * representing the smallest currency unit; Stripe handles them automatically.
 */
export const CURRENCY_PRICE_MULTIPLIERS = {
  // Major reserve
  eur: 0.92, gbp: 0.79, jpy: 150, chf: 0.91,
  // Anglophone
  cad: 1.35, aud: 1.55, nzd: 1.70,
  // European non-EUR
  sek: 10.50, nok: 10.80, dkk: 6.90, pln: 3.90,
  czk: 23.00, huf: 360,  ron: 4.50,  bgn: 1.80,
  // Latin America
  brl: 5.00, mxn: 17.00, clp: 900, cop: 3900,
  pen: 3.70, ars: 900,   uyu: 39,
  // Asia-Pacific
  inr: 83,   sgd: 1.35,  hkd: 7.80, myr: 4.60,
  thb: 35,   php: 56,    idr: 15000, krw: 1320,
  twd: 32,   vnd: 24000,
  // Middle East / Africa
  try: 30,   zar: 18,    ngn: 1500,  aed: 3.70,
  ils: 3.70, sar: 3.75,  egp: 30,    kes: 130,
};

/**
 * Currencies whose amounts are stored as whole integers (no sub-units).
 * Stripe requires these to be plain integers (not cents × 100).
 */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  'jpy','krw','vnd','clp','gnf','mga','pyg','rwf','ugx',
  'xaf','xof','bif','kmf','djf',
]);

/**
 * Build a Stripe `currency_options` object from a base USD amount (in cents).
 * Produces psychologically appealing amounts (e.g. $9.99, R$49.99).
 *
 * @param {number} baseUsdCents - price.unit_amount in USD cents
 * @returns {Object} currency_options map ready for stripe.prices.create/update
 */
/**
 * Build a Stripe `currency_options` object from a base USD amount (in cents).
 *
 * Multiplier semantics:
 *   Decimal currencies  (EUR, BRL, …) → multiplier is foreign-currency units per USD.
 *     rawAmount (in foreign cents) = baseUsdCents × multiplier
 *     e.g. BRL 5.00/USD, $9.95 → 995 × 5 = 4975 centavos = R$49.75
 *
 *   Zero-decimal currencies (JPY, KRW, VND, IDR, …) → multiplier is foreign units per USD.
 *     rawAmount (in whole units) = (baseUsdCents / 100) × multiplier
 *     e.g. VND 24000/USD, $9.95 → 9.95 × 24000 = 238,800 ₫  (fits in Stripe's 99,999,999 max)
 *
 * @param {number} baseUsdCents - price.unit_amount in USD cents (e.g. 995 for $9.95)
 * @returns {Object} currency_options map ready for stripe.prices.create/update
 */
export function buildCurrencyOptions(baseUsdCents) {
  const options = {};
  const baseUsdDollars = baseUsdCents / 100;

  for (const [currency, multiplier] of Object.entries(CURRENCY_PRICE_MULTIPLIERS)) {
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);

    // Zero-decimal: multiply dollars × rate → whole foreign units
    // Decimal:      multiply cents  × rate → foreign sub-units (cents/centavos/pence…)
    const rawAmount = isZeroDecimal
      ? baseUsdDollars * multiplier
      : baseUsdCents * multiplier;

    let amount;
    if (isZeroDecimal) {
      // Round to psychologically appealing whole-unit amounts
      const magnitude = rawAmount < 500 ? 50 : rawAmount < 5000 ? 100 : rawAmount < 50000 ? 500 : 1000;
      amount = Math.max(Math.round(rawAmount / magnitude) * magnitude, 50);
    } else {
      // Round up to next whole "dollar" then subtract 1 cent → $9.99 style
      const roundedDollar = Math.ceil(rawAmount / 100);
      amount = Math.max(roundedDollar * 100 - 1, 50);
    }

    options[currency] = {
      unit_amount: amount,
      tax_behavior: 'exclusive',
    };
  }

  return options;
}

/**
 * Metadata tags for tracking
 */
export const METADATA_TAGS = {
  createdBy: 'admin_price_management',
  subscriptionType: 'subscription',
};

/**
 * Migration query settings
 */
export const MIGRATION_SETTINGS = {
  notificationWindowDays: 60, // Days to look back for notifications
};

/**
 * Stripe API limits
 */
export const STRIPE_LIMITS = {
  priceListLimit: 100,
};
