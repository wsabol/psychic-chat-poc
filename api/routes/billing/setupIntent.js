import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { getOrCreateStripeCustomer, createSetupIntent } from '../../services/stripeService.js';
import { validationError, billingError } from '../../utils/responses.js';

const router = express.Router();

/**
 * POST /billing/setup-intent
 * Creates a SetupIntent for the customer
 */
router.post('/setup-intent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    if (!customerId) {
      return validationError(res, 'Stripe is not configured');
    }

    const setupIntent = await createSetupIntent(customerId);

    res.json({
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
    });
  } catch (error) {
    return billingError(res, 'Failed to create setup intent');
  }
});

export default router;
