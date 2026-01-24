import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { db } from '../../shared/db.js';
import stripe from '../../services/stripeService.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { successResponse, billingError } from '../../utils/responses.js';

const router = express.Router();

/**
 * Update Stripe customer with address from database
 * This is needed for existing customers created before automatic tax implementation
 */
router.post('/update-customer-address', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's address and Stripe customer ID from database
    const result = await db.query(
      `SELECT 
        pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as customer_id,
        country,
        state,
        city
      FROM user_personal_info WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );

    if (!result.rows[0]) {
      return billingError(res, 'User not found');
    }

    const { customer_id, country, state, city } = result.rows[0];

    if (!customer_id) {
      return billingError(res, 'No Stripe customer found');
    }

    if (!country) {
      return billingError(res, 'No address information available. Please update your profile with country information.');
    }

    // Update Stripe customer with address
    const updatedCustomer = await stripe.customers.update(customer_id, {
      address: {
        country: country,
        state: state || undefined,
        city: city || undefined,
      },
    });

    return successResponse(res, {
      success: true,
      message: 'Customer address updated successfully',
      address: updatedCustomer.address,
    });
  } catch (error) {
    logErrorFromCatch(error, 'billing', 'update customer address').catch(() => {});
    return billingError(res, 'Failed to update customer address');
  }
});

export default router;
