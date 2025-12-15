import express from 'express';
import stripe from '../../services/stripeService.js';
import {
  getOrCreateStripeCustomer,
  verifyBankSetupIntent,
  verifyPaymentMethodMicrodeposits,
  listPaymentMethods,
  deletePaymentMethod,
} from '../../services/stripeService.js';

const router = express.Router();

/**
 * Verify bank account via setup intent
 */
router.post('/verify-setup', async (req, res) => {
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

/**
 * Verify bank account via microdeposits
 */
router.post('/verify-microdeposits', async (req, res) => {
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

/**
 * Cleanup unverified bank accounts
 */
router.post('/cleanup-unverified', async (req, res) => {
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

/**
 * Create Financial Connections session
 */
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

/**
 * Get financial accounts from session
 */
router.post('/financial-accounts', async (req, res) => {
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

/**
 * Create bank account payment method from financial account
 * NOTE: mandate_data is not supported in Stripe API v2024-04-10
 * The mandate is automatically collected by Financial Connections
 */
router.post('/create-from-financial', async (req, res) => {
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

export default router;
