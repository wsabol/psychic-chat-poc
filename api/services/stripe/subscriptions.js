import { stripe } from './stripeClient.js';

export async function createSubscription(customerId, priceId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      collection_method: 'charge_automatically',
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  } catch (error) {
    console.error('[STRIPE] Error creating subscription:', error);
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
    console.error('[STRIPE] Error getting subscriptions:', error);
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
    console.error('[STRIPE] Error canceling subscription:', error);
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
    console.error('[STRIPE] Error getting invoices:', error);
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
    console.error('[STRIPE] Error getting charges:', error);
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
    console.error('[STRIPE] Error getting prices:', error);
    return [];
  }
}
