import Stripe from 'stripe';
import { db } from '../shared/db.js';

// Initialize Stripe only if secret key is provided

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    })
  : null;

// Helper to check if Stripe is configured
function ensureStripeConfigured() {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.');
  }
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId, userEmail) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Stripe not configured, returning null');
      return null;
    }
    
    // Check if user already has a Stripe customer ID
    const query = 'SELECT stripe_customer_id FROM user_personal_info WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rows[0]?.stripe_customer_id) {
      return result.rows[0].stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        userId: userId,
      },
    });

    // Save Stripe customer ID to database
    const updateQuery = 'UPDATE user_personal_info SET stripe_customer_id = $1 WHERE user_id = $2';
    await db.query(updateQuery, [customer.id, userId]);

    return customer.id;
  } catch (error) {
    console.error('[STRIPE] Error getting/creating customer:', error);
    throw error;
  }
}

/**
 * Create a SetupIntent for adding payment methods
 */
export async function createSetupIntent(customerId) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Not configured - cannot create setup intent');
      throw new Error('Stripe is not configured. Please check your STRIPE_SECRET_KEY.');
    }

    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'us_bank_account'],
    });
    return intent;
  } catch (error) {
    console.error('[STRIPE] Error creating setup intent');
    console.error('[STRIPE] Error message:', error.message);
    console.error('[STRIPE] Status code:', error.statusCode);
    console.error('[STRIPE] Error type:', error.type);
    throw error;
  }
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(customerId) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Not configured - returning empty methods');
      return { cards: [], bankAccounts: [] };
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const bankAccounts = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'us_bank_account',
    });

    return {
      cards: paymentMethods.data,
      bankAccounts: bankAccounts.data,
    };
  } catch (error) {
    console.error('[STRIPE] Error listing payment methods:', error);
    throw error;
  }
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(paymentMethodId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const result = await stripe.paymentMethods.detach(paymentMethodId);
    return result;
  } catch (error) {
    console.error('[STRIPE] Error deleting payment method:', error);
    throw error;
  }
}

/**
 * Set default payment method for customer
 */
export async function setDefaultPaymentMethod(customerId, paymentMethodId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    return customer;
  } catch (error) {
    console.error('[STRIPE] Error setting default payment method:', error);
    throw error;
  }
}

/**
 * Create a subscription
 */
export async function createSubscription(customerId, priceId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    return subscription;
  } catch (error) {
    console.error('[STRIPE] Error creating subscription:', error);
    throw error;
  }
}

/**
 * Get user's subscriptions
 */
export async function getSubscriptions(customerId) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Not configured - returning empty subscriptions');
      return [];
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });
    return subscriptions.data;
  } catch (error) {
    console.error('[STRIPE] Error getting subscriptions:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
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

/**
 * Get invoices for a customer
 */
export async function getInvoices(customerId) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Not configured - returning empty invoices');
      return [];
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });
    return invoices.data;
  } catch (error) {
    console.error('[STRIPE] Error getting invoices:', error);
    throw error;
  }
}

/**
 * Get charges (payments) for a customer
 */
export async function getCharges(customerId) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Not configured - returning empty charges');
      return [];
    }

    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
    });
    return charges.data;
  } catch (error) {
    console.error('[STRIPE] Error getting charges:', error);
    throw error;
  }
}

/**
 * Get available prices (plans)
 */
export async function getAvailablePrices() {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Not configured - returning empty prices list');
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
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(body, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('[STRIPE] Webhook signature verification failed:', error);
    throw error;
  }
}

export default stripe;
