import { stripe } from './stripeClient.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

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
    // Log error in background (don't await)
    logErrorFromCatch(error, 'stripe', 'create setup intent').catch(() => {});
    throw error;
  }
}

export async function listPaymentMethods(customerId) {
  try {
    if (!stripe) {
      return [];
    }

    const pmResponse = await stripe.paymentMethods.list({
      customer: customerId,
      limit: 100,
    });

    const cards = pmResponse.data.filter(pm => pm.type === 'card');

        return cards;
  } catch (error) {
    // Log error in background (don't await)
    logErrorFromCatch(error, 'stripe', 'list payment methods').catch(() => {});
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
    // Log error in background (don't await)
    logErrorFromCatch(error, 'stripe', 'delete payment method').catch(() => {});
    throw error;
  }
}

