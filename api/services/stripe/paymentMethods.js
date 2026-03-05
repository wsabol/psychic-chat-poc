import { stripe } from './stripeClient.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { getPaymentMethodsForCountry } from '../../utils/currencyByCountry.js';

/**
 * Create a SetupIntent for collecting a payment method.
 *
 * @param {string} customerId - Stripe customer ID
 * @param {object} [options]
 * @param {string} [options.country] - ISO 3166-1 alpha-2 country code.
 *   When provided, locally-relevant recurring payment methods (SEPA, BACS, ACH, ACSS)
 *   are added alongside 'card' so the payment element shows them to the user.
 */
export async function createSetupIntent(customerId, options = {}) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please check your STRIPE_SECRET_KEY.');
    }

    const paymentMethodTypes = getPaymentMethodsForCountry(options.country);

    const intent = await stripe.setupIntents.create({
      customer: customerId,
      // 'off_session' ensures mandates for SEPA/BACS/ACSS are set up correctly
      // for future subscription charges where the customer is not present.
      usage: 'off_session',
      payment_method_types: paymentMethodTypes,
    });
    return intent;
  } catch (error) {
    // Handle stale/invalid customer ID errors specifically
    if (error.code === 'resource_missing' || error.message?.includes('No such customer')) {
      logErrorFromCatch(error, 'stripe', 'Stale customer ID in createSetupIntent');
      
      const staleError = new Error('Customer ID is invalid or has been deleted from Stripe. Please refresh and try again.');
      staleError.code = 'STALE_CUSTOMER_ID';
      staleError.originalError = error;
      throw staleError;
    }
    
    logErrorFromCatch(error, 'stripe', 'create setup intent');
    throw error;
  }
}

/**
 * Recurring-capable payment method types supported for subscriptions.
 * PIX and Boleto are intentionally excluded — they are one-time only.
 */
const RECURRING_PAYMENT_METHOD_TYPES = [
  'card',
  'sepa_debit',
  'bacs_debit',
  'us_bank_account',
  'acss_debit',
];

export async function listPaymentMethods(customerId) {
  try {
    if (!stripe) {
      return [];
    }

    // Fetch all recurring-capable payment method types in parallel
    const results = await Promise.all(
      RECURRING_PAYMENT_METHOD_TYPES.map(type =>
        stripe.paymentMethods.list({ customer: customerId, type, limit: 100 })
          .then(r => r.data)
          .catch(() => []) // Ignore errors for unsupported types in test mode
      )
    );

    // Flatten and return all payment methods
    return results.flat();
  } catch (error) {
    logErrorFromCatch(error, 'stripe', 'list payment methods');
    throw error;
  }
}

export async function deletePaymentMethod(paymentMethodId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    await stripe.paymentMethods.detach(paymentMethodId);
        return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'stripe', 'delete payment method');
    throw error;
  }
}

