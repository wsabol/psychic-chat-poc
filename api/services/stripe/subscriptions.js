import { stripe } from './stripeClient.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Create a Stripe subscription.
 *
 * @param {string} customerId  - Stripe customer ID
 * @param {string} priceId     - Stripe price ID (must have currency_options for non-USD)
 * @param {object} [options]
 * @param {string} [options.currency]    - ISO 4217 code (e.g. 'brl'). Defaults to price base currency.
 * @param {string} [options.countryCode] - ISO 3166-1 alpha-2 (e.g. 'BR'). Stored for reporting only.
 */
export async function createSubscription(customerId, priceId, options = {}) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const { currency } = options;

    const subscriptionParams = {
      customer: customerId,
      items: [{ price: priceId }],
      automatic_tax: { enabled: true },
      payment_behavior: 'default_incomplete',
      collection_method: 'charge_automatically',
      expand: ['latest_invoice.payment_intent'],
    };

    // If a specific currency was requested (and it differs from the base USD price),
    // Stripe will use the matching currency_option on the price object.
    if (currency && currency !== 'usd') {
      subscriptionParams.currency = currency;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);
    return subscription;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    throw error;
  }
}

export async function getSubscriptions(customerId) {
  try {
    if (!stripe) {
      return [];
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });
    return subscriptions.data;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    return [];
  }
}

export async function cancelSubscription(subscriptionId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    throw error;
  }
}

export async function getInvoices(customerId) {
  try {
    if (!stripe) {
      return [];
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });
    return invoices.data;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    return [];
  }
}

export async function getCharges(customerId) {
  try {
    if (!stripe) {
      return [];
    }

    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
    });
    return charges.data;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    return [];
  }
}

export async function getAvailablePrices() {
  try {
    if (!stripe) {
      return [];
    }
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    });
    // Filter out prices whose product has been archived in Stripe.
    // A price can remain active even when its parent product is archived,
    // which would otherwise surface stale/outdated pricing on the subscription page.
    return prices.data.filter(price => price.product?.active !== false);
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    return [];
  }
}
