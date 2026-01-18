/**
 * Admin Subscription Report Endpoint
 * 
 * GET /admin/subscriptions/report
 * 
 * Provides comprehensive subscription summary for admin dashboard:
 * - Total users and subscription breakdown
 * - Users by subscription status
 * - Cancelled subscriptions (last 30 days)
 * - Invalid payment methods
 * - Users without subscriptions or payment methods
 * 
 * Requires: Admin authentication
 */

import express from 'express';
import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

const router = express.Router();

/**
 * GET /report
 * Returns subscription report data
 */
router.get('/report', async (req, res) => {
  try {
    // Get total users and status breakdown
    const summary = await getSubscriptionSummary();
    
    // Get users by status
    const usersByStatus = await getUsersByStatus();
    
    // Get recently cancelled (last 30 days)
    const recentlyCancelled = await getRecentlyCancelledUsers();
    
    // Get users with potential payment issues
    const paymentIssues = await getUsersWithPaymentIssues();
    
    // Get users without subscriptions
    const noSubscription = await getUsersWithoutSubscriptions();
    
    // Get job status
    const jobStatus = getJobStatus();

    res.json({
      timestamp: new Date().toISOString(),
      summary,
      usersByStatus,
      recentlyCancelled,
      paymentIssues,
      noSubscription,
      jobStatus
    });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'admin-subscription-report');
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

/**
 * Get subscription summary statistics
 */
async function getSubscriptionSummary() {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN subscription_status = 'trialing' THEN 1 END) as trialing,
        COUNT(CASE WHEN subscription_status = 'past_due' THEN 1 END) as past_due,
        COUNT(CASE WHEN subscription_status = 'canceled' THEN 1 END) as canceled,
        COUNT(CASE WHEN subscription_status = 'incomplete' THEN 1 END) as incomplete,
        COUNT(CASE WHEN subscription_status = 'unpaid' THEN 1 END) as unpaid,
        COUNT(CASE WHEN subscription_status = 'paused' THEN 1 END) as paused,
        COUNT(CASE WHEN subscription_status IS NULL OR stripe_subscription_id_encrypted IS NULL THEN 1 END) as no_subscription,
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - last_status_check_at))/3600)::NUMERIC, 2) as avg_hours_since_last_check
      FROM user_personal_info
    `;

    const result = await db.query(query);
    return result.rows[0];
  } catch (error) {
    logErrorFromCatch(error, 'app', 'subscription-summary');
    throw error;
  }
}

/**
 * Get users grouped by subscription status
 */
async function getUsersByStatus() {
  try {
    const query = `
      SELECT 
        subscription_status as status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_personal_info), 2) as percentage
      FROM user_personal_info
      WHERE subscription_status IS NOT NULL
      GROUP BY subscription_status
      ORDER BY count DESC
    `;

    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'users-by-status');
    throw error;
  }
}

/**
 * Get recently cancelled subscriptions (last 30 days)
 */
async function getRecentlyCancelledUsers() {
  try {
    const query = `
      SELECT 
        user_id,
        subscription_status,
        subscription_cancelled_at,
        current_period_end,
        plan_name,
        price_amount,
        price_interval,
        EXTRACT(DAY FROM (NOW() - subscription_cancelled_at)) as days_since_cancellation
      FROM user_personal_info
      WHERE subscription_status = 'canceled'
        AND subscription_cancelled_at IS NOT NULL
        AND subscription_cancelled_at >= NOW() - INTERVAL '30 days'
      ORDER BY subscription_cancelled_at DESC
      LIMIT 100
    `;

    const result = await db.query(query);
    
    return {
      count: result.rows.length,
      users: result.rows.map(row => ({
        userId: row.user_id,
        status: row.subscription_status,
        cancelledAt: row.subscription_cancelled_at,
        daysSinceCancellation: parseInt(row.days_since_cancellation),
        planName: row.plan_name,
        priceAmount: row.price_amount,
        priceInterval: row.price_interval
      }))
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'recently-cancelled-users');
    throw error;
  }
}

/**
 * Get users with potential payment issues
 */
async function getUsersWithPaymentIssues() {
  try {
    const query = `
      SELECT 
        user_id,
        subscription_status,
        current_period_start,
        current_period_end,
        last_status_check_at,
        CASE 
          WHEN current_period_end IS NOT NULL AND current_period_end < EXTRACT(EPOCH FROM NOW()) THEN 'expired'
          WHEN subscription_status = 'past_due' THEN 'past_due'
          WHEN subscription_status = 'incomplete' THEN 'incomplete'
          WHEN subscription_status = 'unpaid' THEN 'unpaid'
          ELSE 'other'
        END as issue_type
      FROM user_personal_info
      WHERE subscription_status IN ('past_due', 'incomplete', 'unpaid')
        OR (current_period_end IS NOT NULL AND current_period_end < EXTRACT(EPOCH FROM NOW()))
      ORDER BY last_status_check_at ASC NULLS FIRST
      LIMIT 100
    `;

    const result = await db.query(query);
    
    return {
      count: result.rows.length,
      users: result.rows.map(row => ({
        userId: row.user_id,
        status: row.subscription_status,
        issueType: row.issue_type,
        periodEnd: row.current_period_end ? new Date(row.current_period_end * 1000).toISOString() : null,
        lastChecked: row.last_status_check_at
      }))
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'users-with-payment-issues');
    throw error;
  }
}

/**
 * Get users without subscriptions
 */
async function getUsersWithoutSubscriptions() {
  try {
    const query = `
      SELECT 
        user_id,
        created_at,
        onboarding_completed,
        onboarding_completed_at
      FROM user_personal_info
      WHERE stripe_subscription_id_encrypted IS NULL
        OR subscription_status IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await db.query(query);
    
    return {
      count: result.rows.length,
      users: result.rows.map(row => ({
        userId: row.user_id,
        createdAt: row.created_at,
        onboardingCompleted: row.onboarding_completed,
        onboardingCompletedAt: row.onboarding_completed_at
      }))
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'users-without-subscriptions');
    throw error;
  }
}

/**
 * Get subscription check job status
 */
function getJobStatus() {
  return {
    schedule: 'Every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)',
    nextRun: getNextJobRunTime(),
    environmentVariables: {
      checkAvailable: !!process.env.STRIPE_SECRET_KEY,
      subscriptionCheckOnStartup: process.env.SUBSCRIPTION_CHECK_RUN_ON_STARTUP === 'true'
    }
  };
}

/**
 * Calculate next job run time
 */
function getNextJobRunTime() {
  const now = new Date();
  const runHours = [0, 4, 8, 12, 16, 20];
  let nextHour = null;

  for (const hour of runHours) {
    const nextRun = new Date(now);
    nextRun.setUTCHours(hour, 0, 0, 0);

    if (nextRun > now) {
      nextHour = nextRun;
      break;
    }
  }

  if (!nextHour) {
    // Next run is tomorrow at 00:00 UTC
    nextHour = new Date(now);
    nextHour.setUTCDate(nextHour.getUTCDate() + 1);
    nextHour.setUTCHours(0, 0, 0, 0);
  }

  return nextHour.toISOString();
}

export default router;
