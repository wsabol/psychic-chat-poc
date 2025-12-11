import express from 'express';
import {
  getOrCreateStripeCustomer,
  createSetupIntent,
  listPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  createSubscription,
  getSubscriptions,
  cancelSubscription,
  getInvoices,
  getCharges,
  getAvailablePrices,
} from '../services/stripeService.js';


const router = express.Router();

/**
 * POST /billing/setup-intent
 * Create a SetupIntent for adding payment methods
 */
router.post('/setup-intent', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'Stripe is not configured. Please check your STRIPE_SECRET_KEY.' });
    }

    // Create setup intent
    const setupIntent = await createSetupIntent(customerId);

    res.json({
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
    });
  } catch (error) {
    console.error('[BILLING] Setup intent error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /billing/payment-methods
 * Get all payment methods for user
 */
router.get('/payment-methods', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.json({ cards: [], bankAccounts: [] });
    }
    
    const methods = await listPaymentMethods(customerId);

    res.json(methods);
  } catch (error) {
    console.error('[BILLING] Get payment methods error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /billing/payment-methods/:paymentMethodId
 * Delete a payment method
 */
router.delete('/payment-methods/:paymentMethodId', async (req, res) => {
  try {
    const { paymentMethodId } = req.params;

    const result = await deletePaymentMethod(paymentMethodId);

    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    console.error('[BILLING] Delete payment method error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /billing/set-default-payment-method
 * Set default payment method
 */
router.post('/set-default-payment-method', async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'Stripe is not configured.' });
    }
    
    const customer = await setDefaultPaymentMethod(customerId, paymentMethodId);

    res.json({ success: true, defaultPaymentMethod: customer.invoice_settings?.default_payment_method });
  } catch (error) {
    console.error('[BILLING] Set default payment method error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /billing/create-subscription
 * Create a new subscription
 */
router.post('/create-subscription', async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'Stripe is not configured.' });
    }
    
    const subscription = await createSubscription(customerId, priceId);

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    });
  } catch (error) {
    console.error('[BILLING] Create subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /billing/subscriptions
 * Get user's subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.json([]);
    }
    
    const subscriptions = await getSubscriptions(customerId);

    res.json(subscriptions);
  } catch (error) {
    console.error('[BILLING] Get subscriptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /billing/cancel-subscription/:subscriptionId
 * Cancel a subscription
 */
router.post('/cancel-subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await cancelSubscription(subscriptionId);

    res.json({
      success: true,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error('[BILLING] Cancel subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /billing/invoices
 * Get user's invoices
 */
router.get('/invoices', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.json([]);
    }
    
    const invoices = await getInvoices(customerId);

    res.json(invoices);
  } catch (error) {
    console.error('[BILLING] Get invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /billing/payments
 * Get user's payment transactions (charges)
 */
router.get('/payments', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.json([]);
    }
    
    const charges = await getCharges(customerId);

    res.json(charges);
  } catch (error) {
    console.error('[BILLING] Get payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /billing/available-prices
 * Get available subscription plans
 */
router.get('/available-prices', async (req, res) => {
  try {
    const prices = await getAvailablePrices();
    res.json(prices);
  } catch (error) {
    console.error('[BILLING] Get available prices error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
