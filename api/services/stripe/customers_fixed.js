import { db } from '../../shared/db.js';
import { stripe } from './stripeClient.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';

// ✅ CRITICAL: In-memory lock to prevent duplicate customer creation during concurrent requests
const customerCreationLock = new Map();

export async function getOrCreateStripeCustomer(userId, userEmail) {
  try {
    
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    if (!userId || !userEmail) {
      throw new Error('userId and userEmail are required');
    }

    // ✅ CRITICAL: If another request is already creating a customer for this user, wait for it
    if (customerCreationLock.has(userId)) {
      const result = await customerCreationLock.get(userId);
      return result;
    }

    // Create promise for this request so others wait for it
    const creationPromise = (async () => {
      // Try to get existing Stripe customer ID from database
      let storedCustomerId = null;
      try {
        const query = `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as stripe_customer_id 
                       FROM user_personal_info WHERE user_id = $2`;
        const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);
        storedCustomerId = result.rows[0]?.stripe_customer_id;
      } catch (dbError) {
        storedCustomerId = null;
      }

      // For new users, don't reuse stored customer IDs
      if (storedCustomerId && !process.env.STRIPE_REUSE_CUSTOMERS) {
        try {
          await db.query(
            `UPDATE user_personal_info SET stripe_customer_id_encrypted = NULL WHERE user_id = $1`,
            [userId]
          );
        } catch (e) {
          // Ignore
        }
        storedCustomerId = null;
      }

      if (storedCustomerId) {
        try {
          await stripe.customers.retrieve(storedCustomerId);
          return storedCustomerId;
        } catch (retrieveError) {
          console.warn(`[STRIPE-CUSTOMER] Stored customer verification failed: ${retrieveError.message}`);
          if ((retrieveError.type === 'StripeInvalidRequestError' && retrieveError.raw?.code === 'resource_missing') ||
              retrieveError.message?.includes('No such customer')) {
            try {
              await db.query(
                `UPDATE user_personal_info SET stripe_customer_id_encrypted = NULL WHERE user_id = $1`,
                [userId]
              );
            } catch (updateError) {
              console.warn(`[STRIPE-CUSTOMER] Failed to clear stale ID: ${updateError.message}`);
            }
            storedCustomerId = null;
          } else {
            throw retrieveError;
          }
        }
      }

      // Create new Stripe customer
      let customer;
      try {
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId: userId },
        });
      } catch (createError) {
        console.error(`[STRIPE-CUSTOMER] Failed to create Stripe customer:`, createError.message);
        throw new Error(`Failed to create Stripe customer: ${createError.message}`);
      }

      // Store customer ID in database
      try {
        const updateQuery = `UPDATE user_personal_info 
          SET stripe_customer_id_encrypted = pgp_sym_encrypt($1, $2) 
          WHERE user_id = $3`;
        await db.query(updateQuery, [customer.id, process.env.ENCRYPTION_KEY, userId]);
      } catch (updateError) {
        console.warn(`[STRIPE-CUSTOMER] Could not store customer ID in DB (non-critical):`, updateError.message);
      }
      return customer.id;
    })();

    // Store the creation promise in the lock map
    customerCreationLock.set(userId, creationPromise);

    try {
      const customerId = await creationPromise;
      return customerId;
    } finally {
      // Clean up the lock after completion
      setTimeout(() => customerCreationLock.delete(userId), 100);
    }
  } catch (error) {
    console.error(`[STRIPE-CUSTOMER] FATAL ERROR:`, error.message || error);
    const userIdHash = hashUserId(userId);
    logErrorFromCatch(error, 'stripe', 'get or create stripe customer', userIdHash, null, 'error').catch(() => {});
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
    logErrorFromCatch(error, 'stripe', 'set default payment method', null, null, 'error').catch(() => {});
    throw error;
  }
}
