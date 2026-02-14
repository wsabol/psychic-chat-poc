import { db } from '../../shared/db.js';
import { stripe } from './stripeClient.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';

// In-memory lock to prevent duplicate customer creation
const customerCreationLock = new Map();

export async function getOrCreateStripeCustomer(userId, userEmail) {
  // CRITICAL: Use PostgreSQL advisory lock to prevent concurrent creation across instances
  // Use a hash-based lock ID to minimize collisions and ensure consistency
  const lockId = Math.abs(
    userId.split('').reduce((acc, char, idx) => {
      return ((acc << 5) - acc + char.charCodeAt(0) + idx) | 0;
    }, 0)
  ) % 2147483647;
  
  let hasLock = false;
  let lockAttemptTime = null;
  let isOwnerOfInMemoryLock = false;
  
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
      // Validate the customer still exists in Stripe before returning
      try {
        await stripe.customers.retrieve(existingCustomerId);
        return existingCustomerId;
      } catch (err) {
        // Customer is stale (deleted from Stripe) - clear it and create new one
        if (err.code === 'resource_missing' || err.message?.includes('No such customer')) {
          console.log(`[STRIPE] Fast path: Clearing stale customer ID ${existingCustomerId.substring(0, 12)}... for user ${userId.substring(0, 8)}...`);
          await db.query(
            `UPDATE user_personal_info SET stripe_customer_id_encrypted = NULL WHERE user_id = $1`,
            [userId]
          );
          // Continue to create new customer below (don't return, fall through)
        } else {
          // Unexpected Stripe error - log and throw
          logErrorFromCatch(err, 'stripe', 'Failed to validate stored customer', hashUserId(userId));
          throw err;
        }
      }
    }

    // CRITICAL: Check in-memory lock and create promise atomically
    // This prevents race condition between has() and set()
    let existingPromise = customerCreationLock.get(userId);
    if (existingPromise) {
      // Another request in THIS process is already creating customer, wait for it
      return await existingPromise;
    }

    // ✅ CRITICAL: Create promise and IMMEDIATELY set lock BEFORE any async work starts
    let resolveCreation, rejectCreation;
    const creationPromise = new Promise((resolve, reject) => {
      resolveCreation = resolve;
      rejectCreation = reject;
    });
    
    // Set lock immediately before ANY async operations
    customerCreationLock.set(userId, creationPromise);
    isOwnerOfInMemoryLock = true;

    // Now do the actual async work
    (async () => {
      try {
        // Try to acquire advisory lock (non-blocking)
        lockAttemptTime = Date.now();
        const lockResult = await db.query('SELECT pg_try_advisory_lock($1) as acquired', [lockId]);
        hasLock = lockResult.rows[0]?.acquired;
        
        if (!hasLock) {
          // Another process/instance is creating customer right now
          // FAIL FAST: Check once if customer was just created, then fail with retry signal
          await new Promise(resolve => setTimeout(resolve, 100)); // Brief 100ms wait
          
          const retryResult = await db.query(
            `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as id
             FROM user_personal_info WHERE user_id = $2`,
            [process.env.ENCRYPTION_KEY, userId]
          );
          
          const existingId = retryResult.rows[0]?.id;
          if (existingId) {
            // Customer was just created by other process
            resolveCreation(existingId);
            return;
          }
          
          // Customer still doesn't exist - fail fast with retry signal
          const error = new Error('Another process is creating this customer. Please retry in a moment.');
          error.code = 'CUSTOMER_CREATION_IN_PROGRESS';
          error.statusCode = 503; // Service Unavailable - retry later
          throw error;
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

      // âœ… ALWAYS try to reuse stored customer
      if (storedId) {
        try {
          await stripe.customers.retrieve(storedId);
          resolveCreation(storedId);
          return;
        } catch (err) {
          // Customer doesn't exist in Stripe anymore (deleted or invalid)
          // This is an expected scenario - clear stale ID and create new customer
          if (err.code === 'resource_missing' || err.message?.includes('No such customer')) {
            console.log(`[STRIPE] Clearing stale customer ID for user ${userId.substring(0, 8)}...`);
            await db.query(`UPDATE user_personal_info SET stripe_customer_id_encrypted = NULL WHERE user_id = $1`, [userId]);
          } else {
            // Unexpected error - log it
            logErrorFromCatch(err, 'stripe', 'Failed to retrieve stored customer', hashUserId(userId));
            throw err;
          }
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
          const noUserError = new Error(`User ${userId} does not exist in user_personal_info table`);
          logErrorFromCatch(noUserError, 'stripe', 'User record not found after customer creation', hashUserId(userId), null, 'critical');
          // Delete the customer we just created since we can't store it
          try {
            await stripe.customers.del(customer.id);
          } catch (delErr) {
            logErrorFromCatch(delErr, 'stripe', 'Failed to delete orphaned customer', hashUserId(userId));
          }
          throw new Error('User record not found in database. Cannot create Stripe customer.');
        }
      } catch (e) {
        logErrorFromCatch(e, 'stripe', 'Failed to store customer ID', hashUserId(userId));
        throw e; // Re-throw to prevent returning a customer ID that wasn't stored
      }

        resolveCreation(customer.id);
      } catch (error) {
        rejectCreation(error);
      } finally {
        // Release PostgreSQL advisory lock
        if (hasLock) {
          try {
            await db.query('SELECT pg_advisory_unlock($1)', [lockId]);
          } catch (unlockErr) {
            logErrorFromCatch(unlockErr, 'stripe', `Failed to release advisory lock ${lockId}`, hashUserId(userId));
          }
        }
      }
    })();

    // Wait for the creation to complete
    return await creationPromise;
  } catch (error) {
    const errorContext = `hasLock:${hasLock}, lockId:${lockId}, duration:${lockAttemptTime ? Date.now() - lockAttemptTime : 0}ms`;
    
    logErrorFromCatch(error, 'stripe', `Customer creation failed - ${errorContext}`, hashUserId(userId));
    throw error;
  } finally {
    // Clean up in-memory lock only if we own it
    if (isOwnerOfInMemoryLock) {
      customerCreationLock.delete(userId);
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
    logErrorFromCatch(error, 'stripe', 'set default payment');
    throw error;
  }
}
