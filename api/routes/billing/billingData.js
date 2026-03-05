import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getOrCreateStripeCustomer,
  getInvoices,
  getCharges,
  getAvailablePrices,
} from '../../services/stripeService.js';
import { billingError, successResponse } from '../../utils/responses.js';
import {
  getCurrencyForCountry,
  getPaymentMethodsForCountry,
  isSupportedCurrency,
} from '../../utils/currencyByCountry.js';

const router = express.Router();

/**
 * Get user's invoices
 */
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.json([]);
    }
    
    const invoices = await getInvoices(customerId);
    res.json(invoices);
  } catch (error) {
    return billingError(res, 'Failed to fetch invoices');
  }
});

/**
 * Get user's payments (charges)
 */
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.json([]);
    }
    
    const charges = await getCharges(customerId);
    res.json(charges);
  } catch (error) {
    return billingError(res, 'Failed to fetch payments');
  }
});

/**
 * Get available prices for subscriptions
 */
router.get('/prices', async (req, res) => {
  try {
    const prices = await getAvailablePrices();
    res.json(prices);
  } catch (error) {
    return billingError(res, 'Failed to fetch pricing information');
  }
});

/**
 * GET /billing/locale?country=BR
 *
 * Returns the correct currency and available recurring payment methods for a
 * given ISO 3166-1 alpha-2 country code.  Called by the frontend before
 * showing the payment UI so it can:
 *   - Display the localised price (using Stripe price.currency_options)
 *   - Initialise the SetupIntent / PaymentElement with the right payment methods
 *   - Pass `country` and `currency` to POST /billing/setup-intent and
 *     POST /billing/create-subscription
 *
 * No authentication required — country is not sensitive.
 *
 * Query params:
 *   country  — ISO 3166-1 alpha-2 (e.g. 'BR', 'DE', 'US')
 *   currency — optional ISO 4217 override; validated against supported set
 */
router.get('/locale', (req, res) => {
  const { country, currency: currencyOverride } = req.query;

  // Resolve currency
  let currency;
  if (currencyOverride && isSupportedCurrency(currencyOverride)) {
    currency = currencyOverride.toLowerCase();
  } else {
    currency = getCurrencyForCountry(country);
  }

  const paymentMethods = getPaymentMethodsForCountry(country);

  return successResponse(res, {
    country: country?.toUpperCase() ?? null,
    currency,
    paymentMethods,
    // Convenience flags for the frontend
    hasLocalBankDebit: paymentMethods.length > 1,
    note: paymentMethods.includes('sepa_debit')
      ? 'SEPA direct debit available'
      : paymentMethods.includes('bacs_debit')
      ? 'BACS direct debit available (UK)'
      : paymentMethods.includes('us_bank_account')
      ? 'ACH bank transfer available (US)'
      : paymentMethods.includes('acss_debit')
      ? 'Pre-authorised debit available (CA)'
      : null,
  });
});

export default router;
