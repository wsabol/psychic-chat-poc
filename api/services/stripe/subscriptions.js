import { stripe } from './stripeClient.js';

export async function createSubscription(customerId, priceId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      automatic_tax: { enabled: true },
      payment_behavior: 'default_incomplete',
      collection_method: 'charge_automatically',
      expand: ['latest_invoice.payment_intent'],
    });

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
    return prices.data;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    return [];
  }
}
