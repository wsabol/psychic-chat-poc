import express from 'express';
import stripe from '../services/stripeService.js';
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
  verifyBankSetupIntent,
  verifyPaymentMethodMicrodeposits,
} from '../services/stripeService.js';

const router = express.Router();

router.post('/setup-intent', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'Stripe is not configured. Please check your STRIPE_SECRET_KEY.' });
    }

        const setupIntent = await createSetupIntent(customerId);

    res.json({
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
    });
  } catch (error) {
    console.error('[BILLING] Setup intent error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment-methods', async (req, res) => {
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
      ...methods,
      defaultPaymentMethodId,
    });
  } catch (error) {
    console.error('[BILLING] Get payment methods error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify-bank-setup', async (req, res) => {
  try {
    const { setupIntentId, amounts } = req.body;

    console.log('[BILLING] Verify bank setup request:', { setupIntentId, amounts });

    if (!setupIntentId || !amounts || !Array.isArray(amounts) || amounts.length !== 2) {
      return res.status(400).json({ 
        error: 'setupIntentId and two amounts are required' 
      });
    }

    const parsedAmounts = amounts.map(a => parseInt(a, 10));
    if (parsedAmounts.some(isNaN)) {
      return res.status(400).json({ 
        error: 'Amounts must be valid numbers' 
      });
    }

    const result = await verifyBankSetupIntent(setupIntentId, parsedAmounts);

    console.log('[BILLING] Verification result - Status:', result.status);

    res.json({
      success: true,
      setupIntentStatus: result.status,
      paymentMethodId: result.payment_method,
    });
  } catch (error) {
    console.error('[BILLING] Verify bank setup error:', error.message);
    res.status(400).json({ 
      error: error.message || 'Failed to verify bank account' 
    });
  }
});

router.post('/verify-payment-method', async (req, res) => {
  try {
    const { paymentMethodId, amounts } = req.body;

    console.log('[BILLING] Verify payment method request:', { paymentMethodId, amounts });

    if (!paymentMethodId || !amounts || !Array.isArray(amounts) || amounts.length !== 2) {
      return res.status(400).json({ 
        error: 'paymentMethodId and two amounts are required' 
      });
    }

    const parsedAmounts = amounts.map(a => parseInt(a, 10));
    if (parsedAmounts.some(isNaN)) {
      return res.status(400).json({ 
        error: 'Amounts must be valid numbers' 
      });
    }

    const result = await verifyPaymentMethodMicrodeposits(paymentMethodId, parsedAmounts);

    console.log('[BILLING] Payment method verification result - Status:', result.us_bank_account?.verification_status);

    res.json({
      success: true,
      verificationStatus: result.us_bank_account?.verification_status,
      paymentMethodId: result.id,
    });
  } catch (error) {
    console.error('[BILLING] Verify payment method error:', error.message);
    res.status(400).json({ 
      error: error.message || 'Failed to verify payment method' 
    });
  }
});

router.post('/attach-payment-method', async (req, res) => {
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

    console.log(`[BILLING] Attaching payment method ${paymentMethodId} to customer ${customerId}`);

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    console.log(`[BILLING] Successfully attached payment method ${paymentMethodId}`);

    res.json({ 
      success: true, 
      paymentMethod: paymentMethod 
    });
  } catch (error) {
    console.error('[BILLING] Attach payment method error - Full error:', error);
    console.error('[BILLING] Error message:', error.message);
    // If already attached, just return success
    if (error.message && error.message.includes('already attached')) {
      return res.json({ 
        success: true, 
        message: 'Payment method already attached' 
      });
    }
    res.status(500).json({ error: error.message || 'Failed to attach payment method' });
  }
});

router.delete('/payment-methods/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    console.log(`[BILLING] DELETE request for payment method: ${id}`);

    if (!id) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    const result = await deletePaymentMethod(id);
    
    console.log(`[BILLING] Successfully deleted payment method: ${id}`);

    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    console.error(`[BILLING] Delete payment method error:`, error.message);
    // Provide user-friendly error for pending verification
    if (error.message && (error.message.includes('pending') || error.message.includes('verification'))) {
      return res.status(400).json({ 
        error: 'This bank account cannot be deleted while verification is pending. Please try again later or contact support.' 
      });
    }
    res.status(500).json({ error: error.message || 'Failed to delete payment method' });
  }
});

router.post('/cleanup-unverified-banks', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    console.log('[BILLING] Starting cleanup of unverified banks');

    const methods = await listPaymentMethods(customerId);
    
    const unverifiedBanks = methods.bankAccounts.filter(
      bank => !bank.us_bank_account?.verification_status || bank.us_bank_account.verification_status !== 'verified'
    );

    console.log(`[BILLING] Found ${unverifiedBanks.length} unverified bank accounts for deletion`);

    const deleted = [];
    const errors = [];

    for (const bank of unverifiedBanks) {
      try {
        console.log(`[BILLING] Deleting unverified bank account: ${bank.id}`);
        await deletePaymentMethod(bank.id);
        deleted.push(bank.id);
        console.log(`[BILLING] Successfully deleted: ${bank.id}`);
      } catch (err) {
        console.error(`[BILLING] Error deleting ${bank.id}:`, err.message);
        errors.push({ id: bank.id, error: err.message });
      }
    }

    console.log(`[BILLING] Cleanup complete. Deleted: ${deleted.length}, Errors: ${errors.length}`);

    res.json({
      success: true,
      deletedCount: deleted.length,
      deletedIds: deleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[BILLING] Cleanup unverified banks error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

router.post('/attach-unattached-methods', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer found' });

    console.log('[BILLING] Attaching unattached payment methods');
    const attachedMethods = await stripe.paymentMethods.list({ customer: customerId, limit: 100 });
    const attachedIds = new Set(attachedMethods.data.map(m => m.id));

    const setupIntents = await stripe.setupIntents.list({ customer: customerId, limit: 100, expand: ['data.payment_method'] });
    const unattachedMethods = [];
    for (const si of setupIntents.data) {
      if (si.payment_method && si.payment_method.id && !attachedIds.has(si.payment_method.id)) {
        unattachedMethods.push(si.payment_method);
      }
    }

    console.log(`[BILLING] Found ${unattachedMethods.length} unattached methods`);
    const attached = [];
    const errors = [];

    for (const method of unattachedMethods) {
      try {
        await stripe.paymentMethods.attach(method.id, { customer: customerId });
        attached.push(method.id);
        console.log(`[BILLING] Attached: ${method.id}`);
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

router.post('/financial-connections-session', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    console.log('[BILLING] Creating Financial Connections session for customer:', customerId);

    const session = await stripe.financialConnections.sessions.create({
      account_holder: {
        type: 'customer',
        customer: customerId,
      },
      permissions: ['payment_method', 'balances'],
      filters: {
        countries: ['US'],
      },
    });

    console.log('[BILLING] Financial Connections session created:', session.id);
    res.json({
      sessionId: session.id,
      clientSecret: session.client_secret,
    });
  } catch (error) {
    console.error('[BILLING] Financial Connections session error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/get-financial-accounts', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    console.log('[BILLING] Retrieving Financial Connections session:', sessionId);

    const session = await stripe.financialConnections.sessions.retrieve(sessionId);
    console.log('[BILLING] Session accounts:', session.accounts);

    if (!session.accounts || session.accounts.length === 0) {
      return res.status(400).json({ error: 'No accounts found in session' });
    }

    res.json({
      success: true,
      accounts: session.accounts,
    });
  } catch (error) {
    console.error('[BILLING] Get financial accounts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/create-bank-account-from-financial', async (req, res) => {
  try {
    const { financialAccountId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    if (!financialAccountId) {
      return res.status(400).json({ error: 'financialAccountId is required' });
    }

    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    console.log('[BILLING] Creating payment method from financial account:', financialAccountId);

    const paymentMethod = await stripe.paymentMethods.create({
  type: 'us_bank_account',
  us_bank_account: {
    financial_connections_account: financialAccountId,
  },
  billing_details: {
    name: req.body.name || userEmail,
    email: userEmail,
  },
  
});

    console.log('[BILLING] Payment method created:', paymentMethod.id);
    console.log('[BILLING] Verification status:', paymentMethod.us_bank_account?.verification_status);

    // Attach to customer
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId });
    console.log('[BILLING] Payment method attached to customer');

    res.json({
      success: true,
      paymentMethodId: paymentMethod.id,
      verificationStatus: paymentMethod.us_bank_account?.verification_status,
    });
  } catch (error) {
    console.error('[BILLING] Create bank account from financial error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/confirm-setup-intent', async (req, res) => {
  try {
    const { setupIntentId, paymentMethodId, ipAddress, userAgent } = req.body;

    if (!setupIntentId || !paymentMethodId || !ipAddress || !userAgent) {
      return res.status(400).json({ 
        error: 'setupIntentId, paymentMethodId, ipAddress, and userAgent are required' 
      });
    }

    console.log('[BILLING] Confirming SetupIntent with mandate data:', { setupIntentId, paymentMethodId });

    // Confirm the SetupIntent with mandate_data for ACH
    // Stripe requires ip_address and user_agent in the online customer_acceptance
    const setupIntent = await stripe.setupIntents.confirm(setupIntentId, {
      payment_method: paymentMethodId,
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        },
      },
    });
    console.log('[BILLING] SetupIntent confirmed:', {
      id: setupIntent.id,
      status: setupIntent.status,
      payment_method: setupIntent.payment_method,
    });

    res.json({
      success: true,
      setupIntent: {
        id: setupIntent.id,
        status: setupIntent.status,
        client_secret: setupIntent.client_secret,
        payment_method: setupIntent.payment_method,
      },
    });
  } catch (error) {
    console.error('[BILLING] Confirm SetupIntent error:', error);
    res.status(500).json({ error: error.message });
  }
});

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


