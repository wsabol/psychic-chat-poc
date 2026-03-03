import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { db } from '../../shared/db.js';
import stripe from '../../services/stripeService.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { successResponse, billingError, validationError } from '../../utils/responses.js';

const router = express.Router();

/**
 * Update Stripe customer address (for automatic tax calculation)
 * Billing address is passed directly to Stripe and NOT stored in the database.
 */
router.post('/save-billing-address', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { country, state, city, postalCode, addressLine1 } = req.body;

    if (!country) {
      return validationError(res, 'Country is required');
    }

    // Get Stripe customer ID
    const customerResult = await db.query(
      `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as customer_id
       FROM user_personal_info WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );

    const customerId = customerResult.rows[0]?.customer_id;

    if (customerId) {
      try {
        await stripe.customers.update(customerId, {
          address: {
            country: country,
            state: state || undefined,
            city: city || undefined,
            postal_code: postalCode || undefined,
            line1: addressLine1 || undefined,
          },
        });
      } catch (stripeErr) {
        // Handle deleted/missing customer
        if (stripeErr.code === 'resource_missing' || stripeErr.message?.includes('No such customer')) {
          // Clear stale customer ID
          await db.query(
            `UPDATE user_personal_info SET stripe_customer_id_encrypted = NULL WHERE user_id = $1`,
            [userId]
          );
          logErrorFromCatch(stripeErr, 'billing', 'Cleared stale customer ID during address update', userId);
        } else {
          throw stripeErr;
        }
      }
    }

    return successResponse(res, {
      success: true,
      message: 'Billing address sent to payment processor',
    });
  } catch (error) {
    logErrorFromCatch(error, 'billing', 'update stripe customer address').catch(() => {});
    return billingError(res, 'Failed to update billing address');
  }
});

export default router;
