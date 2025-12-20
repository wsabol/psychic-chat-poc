import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import stripe from '../../services/stripeService.js';
import redis from '../../shared/redis.js';
import {
  getOrCreateStripeCustomer,
  listPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from '../../services/stripeService.js';

const router = express.Router();

// ✅ REQUEST DEDUPLICATION: Map of in-flight requests
const inflightRequests = new Map();

/**
 * Get user's payment methods
 * ✅ OPTIMIZED: Caches result for 10 seconds to avoid repeated Stripe queries
 * ✅ REQUEST DEDUPLICATION: Multiple simultaneous requests share one Stripe call
 */
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

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
      console.log('[BILLING] Cache HIT for payment methods');
      return res.json(JSON.parse(cachedResult));
    }

    console.log('[BILLING] Cache MISS for payment methods - querying Stripe');

    // Create a promise for this request so others can wait for it
    const fetchPromise = (async () => {
      const customerId = await getOrCreateStripeCustomer(userId, userEmail);
      
      if (!customerId) {
        return { cards: [], defaultPaymentMethodId: null };
      }
      
      // ✅ OPTIMIZED: Make both Stripe calls in parallel
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
    })();

    // Store in-flight request
    inflightRequests.set(requestKey, fetchPromise);

    // Wait for result and send response
    const result = await fetchPromise;
    res.json(result);

    // Remove from in-flight map after short delay
    setTimeout(() => inflightRequests.delete(requestKey), 100);
  } catch (error) {
    console.error('[BILLING] Get payment methods error:', error);
    inflightRequests.delete(`payment-methods:${req.user.userId}`);
    res.status(500).json({ error: error.message });
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
      return res.status(400).json({ error: 'paymentMethodId is required' });
    }

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    if (!stripe) {
      return res.status(400).json({ error: 'Stripe is not configured' });
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
    console.error('[BILLING] Attach payment method error:', error);
    if (error.message && error.message.includes('already attached')) {
      return res.json({ 
        success: true, 
        message: 'Payment method already attached' 
      });
    }
    res.status(500).json({ error: error.message || 'Failed to attach payment method' });
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
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    const result = await deletePaymentMethod(id);

    // ✅ CLEAR CACHE: Invalidate payment methods cache
    const cacheKey = `billing:payment-methods:${userId}`;
    await redis.del(cacheKey);

    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    console.error(`[BILLING] Delete payment method error:`, error.message);
    if (error.message && (error.message.includes('pending') || error.message.includes('verification'))) {
      return res.status(400).json({ 
        error: 'This bank account cannot be deleted while verification is pending. Please try again later or contact support.' 
      });
    }
    res.status(500).json({ error: error.message || 'Failed to delete payment method' });
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
      return res.status(400).json({ error: 'Stripe is not configured.' });
    }
    
    const customer = await setDefaultPaymentMethod(customerId, paymentMethodId);

    // ✅ CLEAR CACHE: Invalidate payment methods cache so next fetch is fresh
    const cacheKey = `billing:payment-methods:${userId}`;
    await redis.del(cacheKey);

    res.json({ success: true, defaultPaymentMethod: customer.invoice_settings?.default_payment_method });
  } catch (error) {
    console.error('[BILLING] Set default payment method error:', error);
    res.status(500).json({ error: error.message });
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
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer found' });

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
        console.error(`[BILLING] Error attaching ${method.id}:`, err.message);
        errors.push({ id: method.id, error: err.message });
      }
    }

    // ✅ CLEAR CACHE: Invalidate payment methods cache
    const cacheKey = `billing:payment-methods:${userId}`;
    await redis.del(cacheKey);

    res.json({ success: true, attachedCount: attached.length, attachedIds: attached, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error('[BILLING] Attach unattached methods error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
