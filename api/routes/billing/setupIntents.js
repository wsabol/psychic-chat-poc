import express from 'express';
import {
  getOrCreateStripeCustomer,
  createSetupIntent,
} from '../../services/stripeService.js';
import { validationError, billingError } from '../../utils/responses.js';

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
      return validationError(res, 'Stripe is not configured');
    }

    const setupIntent = await createSetupIntent(customerId);

    res.json({
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
    });
  } catch (error) {
    return billingError(res, 'Failed to create setup intent');
  }
});

export default router;
