import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import stripe from '../../services/stripeService.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { hashUserId } from '../../shared/hashUtils.js';
import {
  getOrCreateStripeCustomer,
  createSubscription,
  getSubscriptions,
  cancelSubscription,
  getAvailablePrices,
  storeSubscriptionData,
} from '../../services/stripeService.js';
import { validationError, billingError } from '../../utils/responses.js';

const router = express.Router();

/**
 * Create subscription
 * ✅ OPTIMIZED: Database storage happens in background (fire-and-forget)
 */
router.post('/create-subscription', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  try {
    const { priceId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    if (!priceId) {
      return validationError(res, 'priceId is required');
    }
    const customerStart = Date.now();
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return validationError(res, 'Stripe is not configured');
    }
    
    const stripeStart = Date.now();
    const subscription = await createSubscription(customerId, priceId);

    // ✅ OPTIMIZED: Store subscription data in background (don't wait)
    // Return response immediately while database update happens in parallel
    storeSubscriptionData(userId, subscription.id, {
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      plan_name: subscription.items?.data?.[0]?.plan?.product?.name,
      price_amount: subscription.items?.data?.[0]?.price?.unit_amount,
      price_interval: subscription.items?.data?.[0]?.price?.recurring?.interval,
        }).catch(err => {
      // Non-critical: Database storage failed, but Stripe subscription was created
      logErrorFromCatch(err, 'billing', 'store subscription data', hashUserId(userId)).catch(() => {});
    });
    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      amountDue: subscription.latest_invoice?.amount_due || 0,
      currency: subscription.latest_invoice?.currency || 'usd',
      invoiceId: subscription.latest_invoice?.id,
    });
  } catch (error) {
    return billingError(res, 'Failed to create subscription');
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
    return billingError(res, 'Failed to fetch subscriptions');
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
      return validationError(res, 'subscriptionId is required');
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
      return billingError(res, 'No invoice found for subscription');
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
    return billingError(res, 'Failed to complete subscription');
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
    return billingError(res, 'Failed to cancel subscription');
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
    return billingError(res, 'Failed to fetch pricing');
  }
});

export default router;
