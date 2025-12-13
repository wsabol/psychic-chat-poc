import Stripe from 'stripe';
import { db } from '../shared/db.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    })
  : null;

function ensureStripeConfigured() {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.');
  }
}

export async function getOrCreateStripeCustomer(userId, userEmail) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Stripe not configured, returning null');
      return null;
    }
    
    const query = 'SELECT stripe_customer_id FROM user_personal_info WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    
    if (result.rows[0]?.stripe_customer_id) {
      return result.rows[0].stripe_customer_id;
    }

    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        userId: userId,
      },
    });

    const updateQuery = 'UPDATE user_personal_info SET stripe_customer_id = $1 WHERE user_id = $2';
    await db.query(updateQuery, [customer.id, userId]);

    return customer.id;
  } catch (error) {
    console.error('[STRIPE] Error getting/creating customer:', error);
    throw error;
  }
}

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

export async function listPaymentMethods(customerId) {
  try {
    if (!stripe) {
      console.warn('[STRIPE] Not configured - returning empty methods');
      return { cards: [], bankAccounts: [] };
    }

    console.log('[STRIPE] Listing ATTACHED payment methods for customer:', customerId);

    const pmResponse = await stripe.paymentMethods.list({
      customer: customerId,
      limit: 100,
    });
    
    const allPaymentMethods = pmResponse.data;
    console.log(`[STRIPE] Found ${allPaymentMethods.length} attached payment methods`);

    const cards = allPaymentMethods.filter(pm => pm.type === 'card');
    let bankAccounts = allPaymentMethods.filter(pm => pm.type === 'us_bank_account');

    console.log('[STRIPE] Attached cards:', cards.length);
    console.log('[STRIPE] Attached bank accounts:', bankAccounts.length);
    
    if (bankAccounts.length > 0) {
      console.log('[STRIPE] Fetching full details for bank accounts');
      const enrichedBanks = [];
      for (const bank of bankAccounts) {
        try {
          const fullDetails = await stripe.paymentMethods.retrieve(bank.id);
          enrichedBanks.push(fullDetails);
        } catch (err) {
          console.error(`[STRIPE] Error retrieving ${bank.id}:`, err.message);
          enrichedBanks.push(bank);
        }
      }
      bankAccounts = enrichedBanks;
      
      console.log('[STRIPE] Bank account details:', bankAccounts.map(b => ({
        id: b.id,
        last4: b.us_bank_account?.last4,
        status: b.us_bank_account?.verification_status,
      })));
    }

    return {
      cards: cards,
      bankAccounts: bankAccounts,
    };
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

    const result = await stripe.paymentMethods.detach(paymentMethodId);
    return result;
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
    return [];
  }
}

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
    return [];
  }
}

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

/**
 * FIXED: Verify bank account by getting payment method from setup intent
 * then calling verifyMicrodeposits on the payment method
 */
export async function verifyBankSetupIntent(setupIntentId, amounts) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    if (!setupIntentId || !amounts || amounts.length !== 2) {
      throw new Error('Invalid setup intent ID or amounts');
    }

    console.log(`[STRIPE] Verifying setup intent ${setupIntentId} with amounts:`, amounts);

    // Get the setup intent and extract the payment method ID
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = setupIntent.payment_method;

    if (!paymentMethodId) {
      throw new Error('No payment method found in setup intent');
    }

    console.log(`[STRIPE] Found payment method in setup intent: ${paymentMethodId}`);

    // Use the CORRECT Stripe API: verifyMicrodeposits on the payment method
    const result = await stripe.paymentMethods.verifyMicrodeposits(
      paymentMethodId,
      { amounts: amounts }
    );

    console.log(`[STRIPE] Microdeposit verification result - Status:`, result.us_bank_account?.verification_status);
    return result;
  } catch (error) {
    console.error('[STRIPE] Error verifying bank setup intent:', error.message);
    throw error;
  }
}

export async function getPaymentMethodDetails(paymentMethodId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    console.log(`[STRIPE] Retrieved payment method ${paymentMethodId}:`, {
      type: paymentMethod.type,
      status: paymentMethod.us_bank_account?.verification_status,
    });

    return paymentMethod;
  } catch (error) {
    console.error('[STRIPE] Error retrieving payment method:', error.message);
    throw error;
  }
}

export async function verifyPaymentMethodMicrodeposits(paymentMethodId, amounts) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    if (!paymentMethodId || !amounts || amounts.length !== 2) {
      throw new Error('Payment method ID and two amounts are required');
    }

    console.log(`[STRIPE] Verifying payment method ${paymentMethodId} with amounts:`, amounts);

    const result = await stripe.paymentMethods.verifyMicrodeposits(
      paymentMethodId,
      { amounts: amounts }
    );

    console.log(`[STRIPE] Verification result - Status:`, result.us_bank_account?.verification_status);
    return result;
  } catch (error) {
    console.error('[STRIPE] Error verifying payment method:', error.message);
    throw error;
  }
}

export default stripe;




