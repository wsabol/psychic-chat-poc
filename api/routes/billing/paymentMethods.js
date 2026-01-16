import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import stripe from '../../services/stripeService.js';
import redis from '../../shared/redis.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';
import {
  getOrCreateStripeCustomer,
  listPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from '../../services/stripeService.js';
import { validationError, billingError } from '../../utils/responses.js';

const router = express.Router();

// ✅ REQUEST DEDUPLICATION: Map of in-flight requests
const inflightRequests = new Map();

/**
 * Get user's payment methods
 * ✅ OPTIMIZED: Caches result for 10 seconds to avoid repeated Stripe queries
 * ✅ REQUEST DEDUPLICATION: Multiple simultaneous requests share one Stripe call
 */
router.get('/payment-methods', authenticateToken, async (req, res) => {
  let userIdHash = null;
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    userIdHash = hashUserId(userId);
    console.log(`[PAYMENT-METHODS] Request for user: ${userId}, email: ${userEmail}`);

    // ✅ REQUEST DEDUPLICATION: If another request is already fetching for this user, wait for it
    const requestKey = `payment-methods:${userId}`;
    if (inflightRequests.has(requestKey)) {
      const result = await inflightRequests.get(requestKey);
      return res.json(result);
    }

    // ✅ CACHE: Check Redis cache first (10 second TTL)
    const cacheKey = `billing:payment-methods:${userId}`;
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }

        // Create a promise for this request so others can wait for it
    const fetchPromise = (async () => {
      console.log(`[PAYMENT-METHODS] Getting/creating Stripe customer for user ${userId}`);
      const customerId = await getOrCreateStripeCustomer(userId, userEmail);
      console.log(`[PAYMENT-METHODS] Got Stripe customer: ${customerId}`);
      
      if (!customerId) {
        return { cards: [], defaultPaymentMethodId: null };
      }
      
            // ✅ OPTIMIZED: Make both Stripe calls in parallel
      try {
        const [methods, customer] = await Promise.all([
          listPaymentMethods(customerId),
          stripe.customers.retrieve(customerId),
        ]);
        
        const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method || null;
      
              const result = {
          cards: methods,
          defaultPaymentMethodId,
        };

        // ✅ CACHE: Store in Redis for 10 seconds
        await redis.setEx(cacheKey, 10, JSON.stringify(result));
        
        return result;
      } catch (stripeError) {
        // If customer doesn't exist in Stripe anymore, return empty (user needs to add payment method again)
        if (stripeError.code === 'resource_missing' || stripeError.message?.includes('No such customer')) {
          const result = { cards: [], defaultPaymentMethodId: null };
          await redis.setEx(cacheKey, 10, JSON.stringify(result));
          return result;
        }
        // Re-throw other errors
        throw stripeError;
      }
    })();

    // Store in-flight request
    inflightRequests.set(requestKey, fetchPromise);

    // Wait for result and send response
    const result = await fetchPromise;
    res.json(result);

    // Remove from in-flight map after short delay
    setTimeout(() => inflightRequests.delete(requestKey), 100);
            } catch (error) {
    console.error(`[PAYMENT-METHODS] ERROR:`, error.message || error);
    console.error(`[PAYMENT-METHODS] Stack:`, error.stack);
    inflightRequests.delete(`payment-methods:${req.user.userId}`);
    // Log error in background (don't await)
    logErrorFromCatch(error, 'billing', 'fetch payment methods', userIdHash, req.ip, 'error').catch(() => {});
    return billingError(res, 'Failed to fetch payment methods');
  }
});

/**
 * Attach payment method to customer
 */
router.post('/payment-methods/attach', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    if (!paymentMethodId) {
      return validationError(res, 'paymentMethodId is required');
    }

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);

    if (!customerId) {
      return validationError(res, 'Customer not found');
    }

    if (!stripe) {
      return validationError(res, 'Stripe is not configured');
    }

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // ✅ CLEAR CACHE: Invalidate payment methods cache so next fetch gets fresh data
    const cacheKey = `billing:payment-methods:${userId}`;
    await redis.del(cacheKey);

    res.json({ 
      success: true, 
      paymentMethod: paymentMethod 
    });
        } catch (error) {
    const userIdHash = hashUserId(req.user.userId);
    // Log error in background (don't await)
    logErrorFromCatch(error, 'billing', 'attach payment method', userIdHash, req.ip, 'error').catch(() => {});
    // Check for Stripe error about payment method already attached to customer
    const errorMsg = error.message || '';
    const alreadyAttached = errorMsg.includes('already been attached') || errorMsg.includes('already attached');
    if (alreadyAttached) {
      return res.json({ 
        success: true, 
        message: 'Payment method already attached' 
      });
    }
    return billingError(res, 'Failed to attach payment method');
  }
});

/**
 * Delete payment method
 */
router.delete('/payment-methods/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.userId;

    if (!id) {
      return validationError(res, 'Payment method ID is required');
    }

    const result = await deletePaymentMethod(id);

    // ✅ CLEAR CACHE: Invalidate payment methods cache
    const cacheKey = `billing:payment-methods:${userId}`;
    await redis.del(cacheKey);

    res.json({ success: true, message: 'Payment method deleted' });
        } catch (error) {
    const userIdHash = hashUserId(req.user.userId);
    // Log error in background (don't await)
    logErrorFromCatch(error, 'billing', 'delete payment method', userIdHash, req.ip, 'error').catch(() => {});
    if (error.message && (error.message.includes('pending') || error.message.includes('verification'))) {
      return validationError(res, 'Bank account verification in progress. Please try again later.');
    }
    return billingError(res, 'Failed to delete payment method');
  }
});

/**
 * Set default payment method
 * ✅ OPTIMIZED: Clears cache immediately so next fetch is fresh
 */
router.post('/payment-methods/set-default', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return validationError(res, 'Stripe is not configured');
    }
    
    const customer = await setDefaultPaymentMethod(customerId, paymentMethodId);

    // ✅ CLEAR CACHE: Invalidate payment methods cache so next fetch is fresh
    const cacheKey = `billing:payment-methods:${userId}`;
    await redis.del(cacheKey);

    res.json({ success: true, defaultPaymentMethod: customer.invoice_settings?.default_payment_method });
        } catch (error) {
    const userIdHash = hashUserId(req.user.userId);
    // Log error in background (don't await)
    logErrorFromCatch(error, 'billing', 'set default payment method', userIdHash, req.ip, 'error').catch(() => {});
    return billingError(res, 'Failed to set default payment method');
  }
});

/**
 * Attach unattached payment methods
 */
router.post('/payment-methods/attach-unattached', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    if (!customerId) return validationError(res, 'No Stripe customer found');

    const attachedMethods = await stripe.paymentMethods.list({ customer: customerId, limit: 100 });
    const attachedIds = new Set(attachedMethods.data.map(m => m.id));

    const setupIntents = await stripe.setupIntents.list({ customer: customerId, limit: 100, expand: ['data.payment_method'] });
    const unattachedMethods = [];
    for (const si of setupIntents.data) {
      if (si.payment_method && si.payment_method.id && !attachedIds.has(si.payment_method.id)) {
        unattachedMethods.push(si.payment_method);
      }
    }

    const attached = [];
    const errors = [];

    for (const method of unattachedMethods) {
      try {
        await stripe.paymentMethods.attach(method.id, { customer: customerId });
        attached.push(method.id);
                  } catch (err) {
        const userIdHash = hashUserId(req.user.userId);
        // Log error in background (don't await)
        logErrorFromCatch(err, 'billing', 'attach unattached payment method', userIdHash, req.ip, 'error').catch(() => {});
        errors.push({ id: method.id, error: err.message });
      }
    }

    // ✅ CLEAR CACHE: Invalidate payment methods cache
    const cacheKey = `billing:payment-methods:${userId}`;
    await redis.del(cacheKey);

    res.json({ success: true, attachedCount: attached.length, attachedIds: attached, errors: errors.length > 0 ? errors : undefined });
        } catch (error) {
    const userIdHash = hashUserId(req.user.userId);
    // Log error in background (don't await)
    logErrorFromCatch(error, 'billing', 'attach unattached payment methods', userIdHash, req.ip, 'error').catch(() => {});
    return billingError(res, 'Failed to attach payment methods');
  }
});

export default router;

