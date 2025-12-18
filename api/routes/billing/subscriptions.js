import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import stripe from '../../services/stripeService.js';
import {
  getOrCreateStripeCustomer,
  createSubscription,
  getSubscriptions,
  cancelSubscription,
  getAvailablePrices,
  storeSubscriptionData,
} from '../../services/stripeService.js';

const router = express.Router();

/**
 * Create subscription
 */
router.post('/create-subscription', authenticateToken, async (req, res) => {
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

    // Store encrypted subscription data in database
    try {
      await storeSubscriptionData(userId, subscription.id, {
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        plan_name: subscription.items?.data?.[0]?.plan?.product?.name,
        price_amount: subscription.items?.data?.[0]?.price?.unit_amount,
        price_interval: subscription.items?.data?.[0]?.price?.recurring?.interval,
      });
    } catch (storageError) {
      console.error('[BILLING] Warning - failed to store subscription in DB:', storageError.message);
      // Don't fail the response - subscription was created in Stripe
    }

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      amountDue: subscription.latest_invoice?.amount_due || 0,
      currency: subscription.latest_invoice?.currency || 'usd',
      invoiceId: subscription.latest_invoice?.id,
    });
  } catch (error) {
    console.error('[BILLING] Create subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's subscriptions
 */
router.get('/subscriptions', authenticateToken, async (req, res) => {
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
 * Complete subscription - finalize incomplete subscription
 * Per Stripe docs: https://stripe.com/docs/billing/subscriptions/fixed-price
 * 
 * Flow:
 * 1. Subscription created with payment_behavior: 'default_incomplete'
 * 2. Invoice is in 'draft' status
 * 3. Call finalizeInvoice to move to 'open' (this triggers payment attempt)
 * 4. If payment method exists, Stripe attempts to collect immediately
 * 5. If 3DS required, paymentIntent.client_secret sent to client for confirmation
 * 6. After payment succeeds, subscription automatically becomes 'active'
 */
router.post('/complete-subscription/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'subscriptionId is required' });
    }

    // Retrieve subscription with latest invoice and payment intent
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice.payment_intent'],
    });

    // Only process if incomplete
    if (subscription.status !== 'incomplete') {
      return res.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
          amountDue: subscription.latest_invoice?.amount_due || 0,
        },
      });
    }

    if (!subscription.latest_invoice) {
      return res.status(400).json({ error: 'No invoice found for subscription' });
    }

    const invoiceId = subscription.latest_invoice.id;
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Step 1: Finalize invoice if still in draft
    if (invoice.status === 'draft') {
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoiceId);
      
      // After finalization, Stripe automatically attempts payment
      // Get updated subscription and invoice to check payment status
      const updatedSub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent'],
      });
      
      return res.json({
        success: true,
        subscription: {
          id: updatedSub.id,
          status: updatedSub.status,
          clientSecret: updatedSub.latest_invoice?.payment_intent?.client_secret || null,
          amountDue: updatedSub.latest_invoice?.amount_due || 0,
        },
      });
    } else { 
      const updatedSub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent'],
      });
      
      return res.json({
        success: true,
        subscription: {
          id: updatedSub.id,
          status: updatedSub.status,
          clientSecret: updatedSub.latest_invoice?.payment_intent?.client_secret || null,
          amountDue: updatedSub.latest_invoice?.amount_due || 0,
        },
      });
    }
  } catch (error) {
    console.error('[BILLING] Complete subscription error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel subscription
 */
router.post('/cancel-subscription/:subscriptionId', authenticateToken, async (req, res) => {
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
 * Get available prices
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
