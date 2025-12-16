import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getOrCreateStripeCustomer,
  getInvoices,
  getCharges,
  getAvailablePrices,
} from '../../services/stripeService.js';

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
    console.error('[BILLING] Get invoices error:', error);
    res.status(500).json({ error: error.message });
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
    console.error('[BILLING] Get payments error:', error);
    res.status(500).json({ error: error.message });
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
    console.error('[BILLING] Get available prices error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
