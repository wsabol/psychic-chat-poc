import Stripe from 'stripe';
import { db } from '../shared/db.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    })
  : null;

export async function getOrCreateStripeCustomer(userId, userEmail) {
  try {
    console.log('[STRIPE] getOrCreateStripeCustomer called with userId:', userId);
    
    if (!stripe) {
      console.warn('[STRIPE] Stripe not configured, returning null');
      return null;
    }
    
    const query = `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as stripe_customer_id 
                   FROM user_personal_info WHERE user_id = $2`;
    const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);
    
    let storedCustomerId = result.rows[0]?.stripe_customer_id;
    
    if (storedCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(storedCustomerId);
        console.log('[STRIPE] Using existing customer:', storedCustomerId);
        return storedCustomerId;
      } catch (retrieveError) {
        if (retrieveError.type === 'StripeInvalidRequestError' && retrieveError.raw?.code === 'resource_missing') {
          await db.query(
            `UPDATE user_personal_info SET stripe_customer_id_encrypted = NULL WHERE user_id = $1`,
            [userId]
          );
          storedCustomerId = null;
        } else {
          throw retrieveError;
        }
      }
    }

    console.log('[STRIPE] Creating new customer for userId:', userId, 'email:', userEmail);
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId: userId },
    });

    const updateQuery = `UPDATE user_personal_info 
                         SET stripe_customer_id_encrypted = pgp_sym_encrypt($1, $2) 
                         WHERE user_id = $3`;
    await db.query(updateQuery, [customer.id, process.env.ENCRYPTION_KEY, userId]);

    return customer.id;
  } catch (error) {
    console.error('[STRIPE] Error getting/creating customer:', error.message);
    throw error;
  }
}

export async function createSetupIntent(customerId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please check your STRIPE_SECRET_KEY.');
    }

    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return intent;
  } catch (error) {
    console.error('[STRIPE] Error creating setup intent');
    console.error('[STRIPE] Error message:', error.message);
    throw error;
  }
}

export async function listPaymentMethods(customerId) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Not configured - returning empty methods');
      return [];
    }

    console.log('[STRIPE] Listing payment methods for customer:', customerId);

    const pmResponse = await stripe.paymentMethods.list({
      customer: customerId,
      limit: 100,
    });
    
    const cards = pmResponse.data.filter(pm => pm.type === 'card');
    console.log('[STRIPE] Attached cards:', cards.length);

    return cards;
  } catch (error) {
    console.error('[STRIPE] Error listing payment methods:', error);
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
    console.error('[STRIPE] Error deleting payment method:', error);
    throw error;
  }
}

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
    
    console.log('[STRIPE] Subscription created:', {
      id: subscription.id,
      status: subscription.status,
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

export async function storeSubscriptionData(userId, stripeSubscriptionId, subscriptionData) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    const query = `UPDATE user_personal_info SET 
      stripe_subscription_id_encrypted = pgp_sym_encrypt($1, $2),
      subscription_status = $3,
      current_period_start = $4,
      current_period_end = $5,
      plan_name = $6,
      price_amount = $7,
      price_interval = $8
      WHERE user_id = $9`;

    const result = await db.query(query, [
      stripeSubscriptionId,
      process.env.ENCRYPTION_KEY,
      subscriptionData.status,
      subscriptionData.current_period_start,
      subscriptionData.current_period_end,
      subscriptionData.plan_name || null,
      subscriptionData.price_amount || null,
      subscriptionData.price_interval || null,
      userId
    ]);

    console.log('[STRIPE] Subscription data stored for user:', userId);
    return result;
  } catch (error) {
    console.error('[STRIPE] Error storing subscription data:', error);
    throw error;
  }
}

export async function getStoredSubscriptionData(userId) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    const query = `SELECT 
      pgp_sym_decrypt(stripe_subscription_id_encrypted, $1) as stripe_subscription_id,
      subscription_status,
      current_period_start,
      current_period_end,
      plan_name,
      price_amount,
      price_interval
      FROM user_personal_info WHERE user_id = $2`;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);
    
    if (result.rows.length === 0 || !result.rows[0].stripe_subscription_id) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('[STRIPE] Error retrieving subscription data:', error);
    return null;
  }
}

export async function updateSubscriptionStatus(userId, statusUpdate) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    const query = `UPDATE user_personal_info SET 
      subscription_status = $1,
      current_period_start = $2,
      current_period_end = $3
      WHERE user_id = $4`;

    const result = await db.query(query, [
      statusUpdate.status,
      statusUpdate.current_period_start,
      statusUpdate.current_period_end,
      userId
    ]);

    console.log('[STRIPE] Subscription status updated for user:', userId);
    return result;
  } catch (error) {
    console.error('[STRIPE] Error updating subscription status:', error);
    throw error;
  }
}

export default stripe;
