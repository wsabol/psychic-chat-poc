#!/usr/bin/env node
/**
 * Admin Script: add-currency-options-to-prices
 *
 * Fetches every active Stripe price and adds `currency_options` so that
 * subscribers worldwide are charged in their local currency without
 * cross-border conversion fees.
 *
 * How it works:
 *  1. Lists all active prices from your Stripe account
 *  2. For each price, computes localised amounts using the multiplier table below
 *  3. Calls stripe.prices.update() to persist the currency_options
 *
 * IMPORTANT — Review the CURRENCY_MULTIPLIERS table before running!
 * These are *suggested* market-parity amounts, not live exchange rates.
 * Adjust any amounts that don't reflect your desired pricing strategy.
 *
 * Zero-decimal currencies (JPY, KRW, VND, etc.) are handled automatically.
 *
 * Run:
 *   node api/scripts/add-currency-options-to-prices.js           (live mode)
 *   node api/scripts/add-currency-options-to-prices.js --dry-run  (preview only)
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY env variable set (or .env loaded)
 *   - Multi-currency pricing enabled for your Stripe account
 *     (Dashboard → Settings → Billing → Multi-currency)
 */

import '../env-loader.js'; // loads .env
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Multipliers relative to USD 1.00
// These produce psychologically appealing, regionally-appropriate prices.
// Adjust freely — these are STARTING POINTS, not financial advice.
// ---------------------------------------------------------------------------
// Zero-decimal currencies (amounts stored as integers without sub-units)
const ZERO_DECIMAL_CURRENCIES = new Set([
  'jpy','krw','vnd','clp','gnf','mga','pyg','rwf','ugx',
  'xaf','xof','bif','kmf','djf',
]);

const CURRENCY_MULTIPLIERS = {
  // — Major —
  usd: 1.00,    // base
  eur: 0.92,    // €0.92 per $1.00
  gbp: 0.79,    // £0.79
  jpy: 150,     // ¥150   (zero-decimal)
  chf: 0.91,    // CHF 0.91

  // — Anglophone —
  cad: 1.35,
  aud: 1.55,
  nzd: 1.70,

  // — European non-EUR —
  sek: 10.50,
  nok: 10.80,
  dkk: 6.90,
  pln: 3.90,
  czk: 23.00,
  huf: 360,     // zero-decimal-like but Stripe stores in minor units × 100
  ron: 4.50,
  bgn: 1.80,

  // — Latin America (PPP-adjusted, not spot rate) —
  brl: 5.00,    // R$5 per $1 → keeps Brazil price affordable
  mxn: 17.00,
  clp: 900,     // zero-decimal
  cop: 3900,
  pen: 3.70,
  ars: 900,     // Very volatile — monitor closely
  uyu: 39,

  // — Asia-Pacific —
  inr: 83,      // PPP-adjusted to keep India accessible
  sgd: 1.35,
  hkd: 7.80,
  myr: 4.60,
  thb: 35,
  php: 56,
  idr: 15000,
  krw: 1320,    // zero-decimal
  twd: 32,
  vnd: 24000,   // zero-decimal

  // — Middle East / Africa —
  try: 30,      // Volatile — check often
  zar: 18,
  ngn: 1500,
  aed: 3.70,
  ils: 3.70,
  sar: 3.75,
  egp: 30,
  kes: 130,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a psychologically appealing amount for a given currency.
 *
 * Multiplier semantics:
 *   Decimal currencies  → multiplier is sub-units per USD.
 *     rawAmount = baseAmountCents × multiplier  (result already in foreign cents)
 *     e.g. BRL 5.00/USD, $9.95 → 995 × 5 = 4975 centavos = R$49.75
 *
 *   Zero-decimal currencies → multiplier is whole-units per USD.
 *     rawAmount = (baseAmountCents / 100) × multiplier  (avoids exceeding Stripe's 99,999,999 limit)
 *     e.g. VND 24000/USD, $9.95 → 9.95 × 24000 = 238,800 ₫
 *     e.g. VND 24000/USD, $99.95 → 99.95 × 24000 = 2,398,800 ₫  ← no longer overflows
 */
function buildCurrencyOptions(baseAmountCents) {
  const options = {};
  const baseAmountDollars = baseAmountCents / 100;

  for (const [currency, multiplier] of Object.entries(CURRENCY_MULTIPLIERS)) {
    if (currency === 'usd') continue;

    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);
    const rawAmount = isZeroDecimal
      ? baseAmountDollars * multiplier     // dollars × rate = whole units
      : baseAmountCents * multiplier;      // cents   × rate = foreign sub-units

    let amount;
    if (isZeroDecimal) {
      const magnitude = rawAmount < 500 ? 50 : rawAmount < 5000 ? 100 : rawAmount < 50000 ? 500 : 1000;
      amount = Math.max(Math.round(rawAmount / magnitude) * magnitude, 50);
    } else {
      const roundedDollar = Math.ceil(rawAmount / 100);
      amount = Math.max(roundedDollar * 100 - 1, 50); // e.g. $10 → 999 ¢ = $9.99
    }

    options[currency] = {
      unit_amount: amount,
      tax_behavior: 'exclusive',
    };
  }

  return options;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌  STRIPE_SECRET_KEY is not set');
    process.exit(1);
  }

  // 1. Fetch all active prices
  let prices = [];
  let hasMore = true;
  let startingAfter;

  while (hasMore) {
    const page = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });

    prices = prices.concat(page.data);
    hasMore = page.has_more;
    if (page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id;
    }
  }

  if (prices.length === 0) {
    return;
  }

  // 2. Process each price
  let updated = 0;
  let skipped = 0;
  let failed  = 0;

  for (const price of prices) {
    const productName = price.product?.name ?? price.product;
    const interval    = price.recurring?.interval ?? 'one-time';
    const baseCurrency = price.currency.toLowerCase();

    // Only USD-based prices can use our USD multiplier table
    if (baseCurrency !== 'usd') {
      skipped++;
      continue;
    }

    const currencyOptions = buildCurrencyOptions(price.unit_amount);

    // Determine which currencies are already set (amounts are immutable once set)
    const existingCurrencies = new Set(Object.keys(price.currency_options ?? {}));
    const newOptions = {};
    const skippedCurrencies = [];

    for (const [cur, opts] of Object.entries(currencyOptions)) {
      if (existingCurrencies.has(cur)) {
        skippedCurrencies.push(cur.toUpperCase());
      } else {
        newOptions[cur] = opts;
      }
    }

    if (Object.keys(newOptions).length === 0) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      const preview = Object.entries(newOptions)
        .slice(0, 5)
        .map(([c, v]) => `${c.toUpperCase()} ${v.unit_amount}`)
        .join(', ');
      skipped++;
      continue;
    }

    try {
      await stripe.prices.update(price.id, { currency_options: newOptions });
      updated++;
    } catch (err) {
      console.error(`      ❌  Failed: ${err.message}\n`);
      failed++;
    }
  }

}

main().catch(err => { console.error(err); process.exit(1); });
