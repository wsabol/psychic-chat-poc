import { db } from '../../shared/db.js';
import { stripe } from './stripeClient.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';

// In-memory lock to prevent duplicate customer creation
const customerCreationLock = new Map();

export async function getOrCreateStripeCustomer(userId, userEmail) {
  // CRITICAL: Use PostgreSQL advisory lock to prevent concurrent creation across instances
  const lockId = Buffer.from(userId).reduce((acc, byte) => acc + byte, 0) % 2147483647;
  let hasLock = false;
  
  try {
    if (!stripe) throw new Error('Stripe is not configured');
    if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
    if (!userId || !userEmail) throw new Error('userId and userEmail required');

    // FAST PATH: Check if customer already exists (avoid locking overhead for existing customers)
    const quickCheck = await db.query(
      `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as id
       FROM user_personal_info WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );
    
    const existingCustomerId = quickCheck.rows[0]?.id;
    if (existingCustomerId) {
      return existingCustomerId;
    }

    // If another request is creating a customer for this user, wait for it
    if (customerCreationLock.has(userId)) {
      return await customerCreationLock.get(userId);
    }

    // ✅ CRITICAL: Create promise and IMMEDIATELY set lock BEFORE any async work
    const creationPromise = (async () => {
      
      // Try to acquire advisory lock (non-blocking)
      const lockResult = await db.query('SELECT pg_try_advisory_lock($1) as acquired', [lockId]);
      hasLock = lockResult.rows[0]?.acquired;
      
      if (!hasLock) {
        // Another process/instance is creating customer, poll until it's created
        
        // Poll up to 10 times (total ~30 seconds max)
        const maxRetries = 10;
        for (let i = 0; i < maxRetries; i++) {
          // Wait with exponential backoff: 1s, 2s, 3s, 4s, 5s, etc.
          const waitTime = Math.min((i + 1) * 1000, 5000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Check if customer was created by the other process
          const retryResult = await db.query(
            `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as id
             FROM user_personal_info WHERE user_id = $2`,
            [process.env.ENCRYPTION_KEY, userId]
          );
          
          const existingId = retryResult.rows[0]?.id;
          if (existingId) {
            return existingId;
          }
        }
        
        // After all retries, customer still doesn't exist - this is an error
        throw new Error('Timeout waiting for customer creation by other process');
      }
      
      // CRITICAL: Verify user exists in database FIRST
      let userRecord = null;
      const result = await db.query(
        `SELECT 
          pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as id,
          pgp_sym_decrypt(billing_country_encrypted, $1) as country,
          pgp_sym_decrypt(billing_state_encrypted, $1) as state,
          pgp_sym_decrypt(billing_city_encrypted, $1) as city,
          pgp_sym_decrypt(billing_postal_code_encrypted, $1) as postal_code,
          pgp_sym_decrypt(billing_address_line1_encrypted, $1) as address_line1
        FROM user_personal_info WHERE user_id = $2`,
        [process.env.ENCRYPTION_KEY, userId]
      );
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error(`User ${userId} not found in user_personal_info table`);
      }
      
      userRecord = result.rows[0];

      const storedId = userRecord.id;
      const billingAddress = userRecord;

      // ✅ ALWAYS try to reuse stored customer
      if (storedId) {
        try {
          await stripe.customers.retrieve(storedId);
          return storedId;
        } catch (err) {
          console.warn(`[STRIPE] Customer ${storedId} doesn't exist in Stripe, will create new`);
          // Customer doesn't exist in Stripe, clear it and create new one
          await db.query(`UPDATE user_personal_info SET stripe_customer_id_encrypted = NULL WHERE user_id = $1`, [userId]);
        }
      }

      // Create new Stripe customer with address for automatic tax calculation
      const customerData = {
        email: userEmail,
        metadata: { userId },
      };
    
      // Add address if available (required for automatic tax)
      if (billingAddress?.country) {
        customerData.address = {
          country: billingAddress.country,
          state: billingAddress.state || undefined,
          city: billingAddress.city || undefined,
          postal_code: billingAddress.postal_code || undefined,
          line1: billingAddress.address_line1 || undefined,
        };
      }
      
      const customer = await stripe.customers.create(customerData);

      // Store in database
      try {
        const updateResult = await db.query(
          `UPDATE user_personal_info SET stripe_customer_id_encrypted = pgp_sym_encrypt($1, $2) WHERE user_id = $3`,
          [customer.id, process.env.ENCRYPTION_KEY, userId]
        );
        
        // Check if the update actually affected a row
        if (updateResult.rowCount === 0) {
          console.error(`[STRIPE] CRITICAL: User ${userId} does not exist in user_personal_info table`);
          // Delete the customer we just created since we can't store it
          try {
            await stripe.customers.del(customer.id);
          } catch (delErr) {
            console.error(`[STRIPE] Failed to delete orphaned customer:`, delErr);
          }
          throw new Error('User record not found in database. Cannot create Stripe customer.');
        }
      } catch (e) {
        console.error(`[STRIPE] Failed to store customer ID:`, e.message);
        throw e; // Re-throw to prevent returning a customer ID that wasn't stored
      }

      return customer.id;
    })();

    // ✅ Set lock RIGHT AFTER promise creation (synchronously)
    customerCreationLock.set(userId, creationPromise);

    try {
      const result = await creationPromise;
      return result;
    } finally {
      // Clean up in-memory lock
      customerCreationLock.delete(userId);
    }
  } catch (error) {
    console.error(`[STRIPE] FATAL:`, error.message);
    logErrorFromCatch(error, 'stripe', 'create customer', hashUserId(userId)).catch(() => {});
    throw error;
  } finally {
    // Release PostgreSQL advisory lock
    if (hasLock) {
      await db.query('SELECT pg_advisory_unlock($1)', [lockId]);
    }
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
