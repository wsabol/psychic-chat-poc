import { stripe } from './stripeClient.js';

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

    const pmResponse = await stripe.paymentMethods.list({
      customer: customerId,
      limit: 100,
    });

    const cards = pmResponse.data.filter(pm => pm.type === 'card');

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
