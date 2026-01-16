import { db } from '../../shared/db.js';
import { stripe } from './stripeClient.js';

export async function getOrCreateStripeCustomer(userId, userEmail) {
  try {
    if (!stripe) {
      return null;
    }

    const query = `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as stripe_customer_id 
                   FROM user_personal_info WHERE user_id = $2`;
    const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);

    let storedCustomerId = result.rows[0]?.stripe_customer_id;

    if (storedCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(storedCustomerId);
        return storedCustomerId;
      } catch (retrieveError) {
        if ((retrieveError.type === 'StripeInvalidRequestError' && retrieveError.raw?.code === 'resource_missing') ||
            retrieveError.message?.includes('No such customer')) {
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

