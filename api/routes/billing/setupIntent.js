import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { getOrCreateStripeCustomer, createSetupIntent } from '../../services/stripeService.js';
import { validationError, billingError, successResponse } from '../../utils/responses.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

const router = express.Router();

/**
 * POST /billing/setup-intent
 * Creates a SetupIntent for the customer
 */
router.post('/setup-intent', authenticateToken, async (req, res) => {
  let retryCount = 0;
  const maxRetries = 1;
  
  while (retryCount <= maxRetries) {
    try {
      const userId = req.user.userId;
      const userEmail = req.user.email;
      
      if (!userId || !userEmail) {
        return validationError(res, 'User information missing');
      }

      // Get or create customer (handles stale customer IDs automatically)
      const customerId = await getOrCreateStripeCustomer(userId, userEmail);
      
      if (!customerId) {
        return validationError(res, 'Stripe is not configured');
      }

      // Accept optional country code from the client so we can include locally
      // relevant recurring payment methods (SEPA, BACS, ACH, ACSS) in the
      // SetupIntent.  Falls back to card-only if country is not provided.
      const country = req.body?.country || null;

      // Create setup intent
      const setupIntent = await createSetupIntent(customerId, { country });

      if (!setupIntent || !setupIntent.client_secret) {
        return billingError(res, 'Failed to generate payment setup credentials');
      }

      return successResponse(res, {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        customerId: customerId,
      });
    } catch (error) {
      // Log detailed error for debugging
      console.error('[SETUP-INTENT] Error:', {
        userId: req.user?.userId,
        error: error.message,
        stack: error.stack,
        code: error.code,
        retryCount
      });
      
      // Handle stale customer ID - retry once to get fresh customer
      if ((error.code === 'STALE_CUSTOMER_ID' || 
           error.code === 'resource_missing' || 
           error.message?.includes('No such customer')) && 
          retryCount < maxRetries) {
        
        await logErrorFromCatch(error, 'billing', `Stale customer ID detected (attempt ${retryCount + 1})`, req.user?.userId);
        retryCount++;
        continue; // Retry the request
      }
      
      // Handle specific error cases (no more retries)
      if (error.code === 'CUSTOMER_CREATION_IN_PROGRESS') {
        return res.status(503).json({
          success: false,
          error: 'Service Temporarily Unavailable',
          message: 'Payment setup is in progress. Please try again in a moment.',
          retryAfter: 2
        });
      }
      
      if (error.code === 'STALE_CUSTOMER_ID' || 
          error.code === 'resource_missing' || 
          error.message?.includes('No such customer')) {
        await logErrorFromCatch(error, 'billing', 'Stale customer ID persists after retry', req.user?.userId);
        return billingError(res, 'Payment setup failed due to stale customer data. Please contact support.');
      }
      
      if (error.message?.includes('Stripe is not configured')) {
        return validationError(res, 'Payment processing is not configured. Please contact support.');
      }

      // ✅ Stripe auth errors (wrong/expired API key) → 503, not 500
      if (error.type === 'StripeAuthenticationError' || error.statusCode === 401) {
        return res.status(503).json({
          success: false,
          error: 'Payment Service Unavailable',
          message: 'Payment processing is temporarily unavailable. Please try again later.',
          retryAfter: 30
        });
      }
      
      return billingError(res, error.message || 'Failed to create setup intent');
    }
  }
});

export default router;
