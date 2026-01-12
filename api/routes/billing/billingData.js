import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getOrCreateStripeCustomer,
  getInvoices,
  getCharges,
  getAvailablePrices,
} from '../../services/stripeService.js';
import { billingError } from '../../utils/responses.js';

const router = express.Router();

/**
 * Get user's invoices
 */
router.get('/invoices', authenticateToken, async (req, res) => {
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
    return billingError(res, 'Failed to fetch invoices');
  }
});

/**
 * Get user's payments (charges)
 */
router.get('/payments', authenticateToken, async (req, res) => {
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
    return billingError(res, 'Failed to fetch payments');
  }
});

/**
 * Get available prices for subscriptions
 */
router.get('/prices', async (req, res) => {
  try {
    const prices = await getAvailablePrices();
    res.json(prices);
  } catch (error) {
    return billingError(res, 'Failed to fetch pricing information');
  }
});

export default router;
