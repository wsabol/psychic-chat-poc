import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { db } from '../../shared/db.js';
import stripe from '../../services/stripeService.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { successResponse, billingError, validationError } from '../../utils/responses.js';

const router = express.Router();

/**
 * Save billing address to database (encrypted)
 * Also updates Stripe customer with address for automatic tax calculation
 */
router.post('/save-billing-address', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { country, state, city, postalCode, addressLine1 } = req.body;

    if (!country) {
      return validationError(res, 'Country is required');
    }

    // Save to database (encrypted)
    await db.query(
      `UPDATE user_personal_info 
       SET billing_country_encrypted = pgp_sym_encrypt($1, $2),
           billing_state_encrypted = pgp_sym_encrypt($3, $2),
           billing_city_encrypted = pgp_sym_encrypt($4, $2),
           billing_postal_code_encrypted = pgp_sym_encrypt($5, $2),
           billing_address_line1_encrypted = pgp_sym_encrypt($6, $2)
       WHERE user_id = $7`,
      [
        country,
        process.env.ENCRYPTION_KEY,
        state || '',
        city || '',
        postalCode || '',
        addressLine1 || '',
        userId
      ]
    );

    // Update Stripe customer with address (for automatic tax)
    try {
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
    } catch (err) {
      // Non-critical - Stripe update failed but database was updated
      logErrorFromCatch(err, 'billing', 'update stripe customer address').catch(() => {});
    }

    return successResponse(res, {
      success: true,
      message: 'Billing address saved successfully',
    });
  } catch (error) {
    logErrorFromCatch(error, 'billing', 'save billing address').catch(() => {});
    return billingError(res, 'Failed to save billing address');
  }
});

export default router;
