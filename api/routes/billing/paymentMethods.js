import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import stripe from '../../services/stripeService.js';
import {
  getOrCreateStripeCustomer,
  listPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from '../../services/stripeService.js';

const router = express.Router();

/**
 * Get user's payment methods
 */
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.json({ cards: [], bankAccounts: [] });
    }
    
    const methods = await listPaymentMethods(customerId);
    
    // Also fetch customer to get default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method || null;
    
    res.json({
      cards: methods,
      defaultPaymentMethodId,
    });
  } catch (error) {
    console.error('[BILLING] Get payment methods error:', error);
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

    if (!id) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    const result = await deletePaymentMethod(id);

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

    res.json({ success: true, attachedCount: attached.length, attachedIds: attached, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error('[BILLING] Attach unattached methods error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
