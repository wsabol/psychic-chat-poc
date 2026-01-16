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
    logErrorFromCatch(error, 'app', 'stripe');
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
      payment_method_types: ['card', 'us_bank_account'],
    });
    return intent;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    logErrorFromCatch(error, 'app', 'stripe');
    logErrorFromCatch(error, 'app', 'stripe');
    logErrorFromCatch(error, 'app', 'stripe');
    throw error;
  }
}

export async function listPaymentMethods(customerId) {
  try {
    if (!stripe) {
      return { cards: [], bankAccounts: [] };
    }

    const pmResponse = await stripe.paymentMethods.list({
      customer: customerId,
      limit: 100,
    });
    
    const allPaymentMethods = pmResponse.data;

    const cards = allPaymentMethods.filter(pm => pm.type === 'card');
    let bankAccounts = allPaymentMethods.filter(pm => pm.type === 'us_bank_account');
    
    if (bankAccounts.length > 0) {
      const enrichedBanks = [];
      for (const bank of bankAccounts) {
        try {
          const fullDetails = await stripe.paymentMethods.retrieve(bank.id);
          enrichedBanks.push(fullDetails);
        } catch (err) {
          logErrorFromCatch(error, 'app', 'stripe');
          enrichedBanks.push(bank);
        }
      }
      bankAccounts = enrichedBanks;
      
    }

    return {
      cards: cards,
      bankAccounts: bankAccounts,
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
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
    logErrorFromCatch(error, 'app', 'stripe');
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
    logErrorFromCatch(error, 'app', 'stripe');
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

export function verifyWebhookSignature(body, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
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

    // Get the setup intent and extract the payment method ID
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = setupIntent.payment_method;

    if (!paymentMethodId) {
      throw new Error('No payment method found in setup intent');
    }

    // Use the CORRECT Stripe API: verifyMicrodeposits on the payment method
    const result = await stripe.paymentMethods.verifyMicrodeposits(
      paymentMethodId,
      { amounts: amounts }
    );

    return result;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    throw error;
  }
}

export async function getPaymentMethodDetails(paymentMethodId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return paymentMethod;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
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


    const result = await stripe.paymentMethods.verifyMicrodeposits(
      paymentMethodId,
      { amounts: amounts }
    );

    return result;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    throw error;
  }
}

export default stripe;

