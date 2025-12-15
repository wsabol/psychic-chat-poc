import express from 'express';
import { getOrCreateStripeCustomer, createSetupIntent } from '../../services/stripeService.js';

const router = express.Router();

/**
 * POST /billing/setup-intent
 * Creates a SetupIntent for the customer
 */
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

export default router;
