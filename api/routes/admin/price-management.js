/**
 * Price Management Routes
 * Admin endpoints for managing Stripe price changes
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { successResponse, validationError, serverError } from '../../utils/responses.js';
import {
  createNewPrice,
  getAllActivePrices,
  getActiveSubscriberCount,
  bulkMigrateSubscriptions,
  getMigrationStatus
} from '../../services/stripe/priceManagement.js';
import { sendPriceChangeNotifications, schedulePriceChange } from '../../services/stripe/billingNotifications.js';

const router = Router();

/**
 * GET /admin/price-management/prices
 * Get all active Stripe prices
 */
router.get('/prices', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const prices = await getAllActivePrices();

    return successResponse(res, {
      success: true,
      prices: prices
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /admin/price-management/prices/create
 * Create new price in Stripe with automatic tax collection
 * Body: { amount, interval }
 */
router.post('/prices/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { amount, interval } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return validationError(res, 'Valid amount required (in cents)');
    }
    if (!interval || !['month', 'year'].includes(interval)) {
      return validationError(res, 'Valid interval required (month or year)');
    }

    const price = await createNewPrice(amount, interval);

    return successResponse(res, {
      success: true,
      message: 'Price created successfully with tax collection enabled',
      price: price
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * GET /admin/price-management/subscribers/:interval
 * Get count of active subscribers by interval
 * Params: interval (month or year)
 */
router.get('/subscribers/:interval', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { interval } = req.params;

    if (!['month', 'year'].includes(interval)) {
      return validationError(res, 'Valid interval required (month or year)');
    }

    const count = await getActiveSubscriberCount(interval);

    return successResponse(res, {
      success: true,
      interval,
      count: count
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /admin/price-management/schedule-price-change
 * Schedule price change - creates new prices in Stripe then schedules migration
 * Sends notifications immediately, schedules automatic migration after 30 days
 * Body: { 
 *   monthly: { oldPriceId, newAmount },  // newAmount in cents, system creates price
 *   annual: { oldPriceId, newAmount }
 * }
 */
router.post('/schedule-price-change', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('[Schedule Price Change] Request received');
    console.log('[Schedule Price Change] Body:', JSON.stringify(req.body, null, 2));
    
    const { monthly, annual } = req.body;

    // At least one price change must be specified
    if (!monthly && !annual) {
      console.log('[Schedule Price Change] Error: No price changes specified');
      return validationError(res, 'At least one price change (monthly or annual) required');
    }

    // Process monthly price change
    let monthlyData = null;
    if (monthly) {
      console.log('[Schedule Price Change] Processing monthly price change...');
      
      // Validate
      if (!monthly.oldPriceId) {
        console.log('[Schedule Price Change] Error: Monthly old price ID missing');
        return validationError(res, 'Monthly old price ID required');
      }
      if (!monthly.newAmount || monthly.newAmount <= 0) {
        console.log('[Schedule Price Change] Error: Invalid monthly new amount');
        return validationError(res, 'Valid monthly new amount required (in cents)');
      }

      console.log(`[Schedule Price Change] Fetching prices to find old price: ${monthly.oldPriceId}`);
      
      // Get old price details from Stripe to get old amount
      const prices = await getAllActivePrices();
      const oldPrice = prices.find(p => p.id === monthly.oldPriceId);
      
      if (!oldPrice) {
        console.log('[Schedule Price Change] Error: Old monthly price not found in Stripe');
        return validationError(res, 'Old monthly price not found');
      }

      console.log(`[Schedule Price Change] Old monthly price found: ${oldPrice.unit_amount} cents`);
      console.log(`[Schedule Price Change] Creating new monthly price: ${monthly.newAmount} cents`);

      // Create new price in Stripe with tax collection
      const newPrice = await createNewPrice(monthly.newAmount, 'month');
      
      console.log(`[Schedule Price Change] New monthly price created: ${newPrice.id}`);

      monthlyData = {
        oldPriceId: monthly.oldPriceId,
        newPriceId: newPrice.id,
        oldAmount: oldPrice.unit_amount,
        newAmount: monthly.newAmount
      };
    }

    // Process annual price change
    let annualData = null;
    if (annual) {
      console.log('[Schedule Price Change] Processing annual price change...');
      
      // Validate
      if (!annual.oldPriceId) {
        console.log('[Schedule Price Change] Error: Annual old price ID missing');
        return validationError(res, 'Annual old price ID required');
      }
      if (!annual.newAmount || annual.newAmount <= 0) {
        console.log('[Schedule Price Change] Error: Invalid annual new amount');
        return validationError(res, 'Valid annual new amount required (in cents)');
      }

      console.log(`[Schedule Price Change] Fetching prices to find old price: ${annual.oldPriceId}`);

      // Get old price details from Stripe
      const prices = await getAllActivePrices();
      const oldPrice = prices.find(p => p.id === annual.oldPriceId);
      
      if (!oldPrice) {
        console.log('[Schedule Price Change] Error: Old annual price not found in Stripe');
        return validationError(res, 'Old annual price not found');
      }

      console.log(`[Schedule Price Change] Old annual price found: ${oldPrice.unit_amount} cents`);
      console.log(`[Schedule Price Change] Creating new annual price: ${annual.newAmount} cents`);

      // Create new price in Stripe with tax collection
      const newPrice = await createNewPrice(annual.newAmount, 'year');
      
      console.log(`[Schedule Price Change] New annual price created: ${newPrice.id}`);

      annualData = {
        oldPriceId: annual.oldPriceId,
        newPriceId: newPrice.id,
        oldAmount: oldPrice.unit_amount,
        newAmount: annual.newAmount
      };
    }

    console.log('[Schedule Price Change] Scheduling notifications and migrations...');
    console.log('[Schedule Price Change] Monthly data:', monthlyData);
    console.log('[Schedule Price Change] Annual data:', annualData);

    // Schedule notifications and migrations
    const result = await schedulePriceChange(monthlyData, annualData);

    console.log('[Schedule Price Change] Result:', result);
    console.log('[Schedule Price Change] Success! Sending response...');

    return successResponse(res, {
      success: true,
      message: `Price change scheduled. Notifications sent to ${result.totalSent} subscribers. Automatic migration in 30 days.`,
      monthly: result.monthly,
      annual: result.annual,
      monthlyNewPriceId: monthlyData?.newPriceId,
      annualNewPriceId: annualData?.newPriceId,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed
    });
  } catch (error) {
    console.error('[Schedule Price Change] Fatal error:', error);
    console.error('[Schedule Price Change] Error stack:', error.stack);
    return serverError(res, error.message);
  }
});

/**
 * POST /admin/price-management/notify
 * Send price change notifications to subscribers (legacy endpoint - use schedule-price-change instead)
 * Body: { interval, oldAmount, newAmount, oldPriceId, newPriceId }
 */
router.post('/notify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { interval, oldAmount, newAmount, oldPriceId, newPriceId } = req.body;

    // Validate required fields
    if (!interval || !['month', 'year'].includes(interval)) {
      return validationError(res, 'Valid interval required (month or year)');
    }
    if (!oldAmount || oldAmount <= 0) {
      return validationError(res, 'Valid old amount required (in cents)');
    }
    if (!newAmount || newAmount <= 0) {
      return validationError(res, 'Valid new amount required (in cents)');
    }
    if (!oldPriceId) {
      return validationError(res, 'Old price ID required');
    }
    if (!newPriceId) {
      return validationError(res, 'New price ID required');
    }

    const result = await sendPriceChangeNotifications(
      interval,
      oldAmount,
      newAmount,
      oldPriceId,
      newPriceId
    );

    return successResponse(res, {
      success: true,
      message: `Notifications sent to ${result.successful} subscribers`,
      sent: result.successful,
      failed: result.failed
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * POST /admin/price-management/migrate
 * Migrate subscriptions to new price
 * Body: { oldPriceId, newPriceId, interval, newAmount }
 */
router.post('/migrate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { oldPriceId, newPriceId, interval, newAmount } = req.body;

    // Validate required fields
    if (!oldPriceId) {
      return validationError(res, 'Old price ID required');
    }
    if (!newPriceId) {
      return validationError(res, 'New price ID required');
    }
    if (!interval || !['month', 'year'].includes(interval)) {
      return validationError(res, 'Valid interval required (month or year)');
    }
    if (!newAmount || newAmount <= 0) {
      return validationError(res, 'Valid new amount required (in cents)');
    }

    const result = await bulkMigrateSubscriptions(
      oldPriceId,
      newPriceId,
      interval,
      newAmount
    );

    return successResponse(res, {
      success: true,
      message: `Migrated ${result.successful} subscriptions`,
      migrated: result.successful,
      failed: result.failed
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

/**
 * GET /admin/price-management/status/:interval
 * Get migration status for an interval
 * Params: interval (month or year)
 */
router.get('/status/:interval', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { interval } = req.params;

    if (!['month', 'year'].includes(interval)) {
      return validationError(res, 'Valid interval required (month or year)');
    }

    const status = await getMigrationStatus(interval);

    return successResponse(res, {
      success: true,
      interval,
      status: status
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
