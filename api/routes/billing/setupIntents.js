import express from 'express';
import {
  getOrCreateStripeCustomer,
  createSetupIntent,
} from '../../services/stripeService.js';

const router = express.Router();

/**
 * Create setup intent for payment method verification
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return res.status(400).json({ error: 'Stripe is not configured. Please check your STRIPE_SECRET_KEY.' });
    }

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

export default router;
