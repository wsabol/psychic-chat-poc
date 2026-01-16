import { db } from '../../shared/db.js';
import { stripe } from './stripeClient.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';

// In-memory lock to prevent duplicate customer creation
const customerCreationLock = new Map();

export async function getOrCreateStripeCustomer(userId, userEmail) {
  try {
    if (!stripe) throw new Error('Stripe is not configured');
    if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
    if (!userId || !userEmail) throw new Error('userId and userEmail required');

    // If another request is creating a customer for this user, wait for it
    if (customerCreationLock.has(userId)) {
      console.log(`[STRIPE] Waiting for in-flight creation: ${userId}`);
      return await customerCreationLock.get(userId);
    }

    const creationPromise = (async () => {
      // Try to get existing customer from DB
      let storedId = null;
      try {
        const result = await db.query(
          `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as id FROM user_personal_info WHERE user_id = $2`,
          [process.env.ENCRYPTION_KEY, userId]
        );
        storedId = result.rows[0]?.id;
      } catch (e) {
        // No record yet
      }

      // ✅ ALWAYS try to reuse stored customer
      if (storedId) {
        try {
          await stripe.customers.retrieve(storedId);
          console.log(`[STRIPE] ✓ Using existing customer: ${storedId}`);
          return storedId;
        } catch (err) {
          // Customer doesn't exist in Stripe, clear it and create new one
          console.log(`[STRIPE] Stored customer invalid: ${err.message}, creating new`);
          try {
            await db.query(`UPDATE user_personal_info SET stripe_customer_id_encrypted = NULL WHERE user_id = $1`, [userId]);
          } catch (e) {}
        }
      }

      // Create new Stripe customer
      console.log(`[STRIPE] Creating new customer for ${userEmail}`);
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      console.log(`[STRIPE] ✓ Created: ${customer.id}`);

      // Store in database
      try {
        await db.query(
          `UPDATE user_personal_info SET stripe_customer_id_encrypted = pgp_sym_encrypt($1, $2) WHERE user_id = $3`,
          [customer.id, process.env.ENCRYPTION_KEY, userId]
        );
      } catch (e) {
        console.warn(`[STRIPE] Could not store ID (non-critical): ${e.message}`);
      }

      return customer.id;
    })();

    customerCreationLock.set(userId, creationPromise);

    try {
      return await creationPromise;
    } finally {
      setTimeout(() => customerCreationLock.delete(userId), 100);
    }
  } catch (error) {
    console.error(`[STRIPE] FATAL:`, error.message);
    logErrorFromCatch(error, 'stripe', 'create customer', hashUserId(userId)).catch(() => {});
    throw error;
  }
}

export async function setDefaultPaymentMethod(customerId, paymentMethodId) {
  try {
    if (!stripe) throw new Error('Stripe not configured');
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    return customer;
  } catch (error) {
    logErrorFromCatch(error, 'stripe', 'set default payment').catch(() => {});
    throw error;
  }
}
