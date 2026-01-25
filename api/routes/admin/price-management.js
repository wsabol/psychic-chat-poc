/**
 * Price Management Routes
 * Admin endpoints for managing Stripe price changes
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { successResponse, validationError, serverError } from '../../utils/responses.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
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
    
    const { monthly, annual } = req.body;

    // At least one price change must be specified
    if (!monthly && !annual) {
    }

    // Process monthly price change
    let monthlyData = null;
    if (monthly) {
      
      // Get old price details from Stripe to get old amount
      const prices = await getAllActivePrices();
      const oldPrice = prices.find(p => p.id === monthly.oldPriceId);
      
      if (!oldPrice) {
        return validationError(res, 'Old monthly price not found');
      }

      // Create new price in Stripe with tax collection
      const newPrice = await createNewPrice(monthly.newAmount, 'month');

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

      // Get old price details from Stripe
      const prices = await getAllActivePrices();
      const oldPrice = prices.find(p => p.id === annual.oldPriceId);
      
      if (!oldPrice) {
        return validationError(res, 'Old annual price not found');
      }

      // Create new price in Stripe with tax collection
      const newPrice = await createNewPrice(annual.newAmount, 'year');

      annualData = {
        oldPriceId: annual.oldPriceId,
        newPriceId: newPrice.id,
        oldAmount: oldPrice.unit_amount,
        newAmount: annual.newAmount
      };
    }

    // Schedule notifications and migrations
    const result = await schedulePriceChange(monthlyData, annualData);

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
    logErrorFromCatch(error, 'price-management-routes', 'schedule-price-change');
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
