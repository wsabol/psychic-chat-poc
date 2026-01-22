/**
 * Stripe Webhook Handler - ENHANCED
 * 
 * IMPORTANT: This endpoint must be BEFORE authentication middleware
 * Stripe sends a raw body and specific headers for signature verification
 * 
 * Handles events:
 * - customer.subscription.created -> Store subscription
 * - customer.subscription.updated -> Update status, detect changes, notify
 * - customer.subscription.deleted -> Mark as cancelled, notify
 * - invoice.payment_succeeded -> Mark subscription as active
 * - invoice.payment_failed -> Mark subscription as past_due, notify
 * - payment_method.detached -> Notify user to add payment method
 */

import express from 'express';
import { db } from '../../shared/db.js';
import {
  verifyWebhookSignature,
  updateSubscriptionStatus,
  storeSubscriptionData,
} from '../../services/stripeService.js';
import { notifyBillingEvent } from '../../services/stripe/billingNotifications.js';
import Stripe from 'stripe';
import { serverError } from '../../utils/responses.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { successResponse } from '../../utils/responses.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

const router = express.Router();

/**
 * Extract user ID from Stripe subscription
 * Decrypts customer ID and finds matching user
 */
const extractUserIdFromSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer;
    
    // Query database to find user_id by stripe_customer_id_encrypted
    const query = `SELECT user_id FROM user_personal_info 
                   WHERE stripe_customer_id_encrypted IS NOT NULL LIMIT 100`;
    const allUsers = await db.query(query);
    
    // Decrypt and match customer ID
    for (const user of allUsers.rows) {
      const decryptQuery = `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as cid 
                           FROM user_personal_info WHERE user_id = $2`;
      const result = await db.query(decryptQuery, [process.env.ENCRYPTION_KEY, user.user_id]);
      if (result.rows[0]?.cid === customerId) {
        return user.user_id;
      }
    }
  } catch (error) {
    logErrorFromCatch(error, 'app', 'webhook');
  }
  return null;
};

router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    let event;
    try {
      event = verifyWebhookSignature(req.body, req.headers['stripe-signature']);
    } catch (error) {
      return serverError(res, 'Webhook signature verification failed');
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const userId = await extractUserIdFromSubscription(subscription.id);

        if (!userId) {
          return successResponse(res, { received: true });
        }

        try {
          await storeSubscriptionData(userId, subscription.id, {
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            plan_name: subscription.items?.data?.[0]?.plan?.product?.name,
            price_amount: subscription.items?.data?.[0]?.price?.unit_amount,
            price_interval: subscription.items?.data?.[0]?.price?.recurring?.interval,
          });
        } catch (error) {
          logErrorFromCatch(error, 'app', 'webhook');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = await extractUserIdFromSubscription(subscription.id);

        if (!userId) {
          return successResponse(res, { received: true });
        }

        try {
          // Get previous status to detect changes
          const prevStatusQuery = 'SELECT subscription_status FROM user_personal_info WHERE user_id = $1';
          const prevResult = await db.query(prevStatusQuery, [userId]);
          const previousStatus = prevResult.rows[0]?.subscription_status;

          // Update subscription status
          await updateSubscriptionStatus(userId, {
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
          });

          // Check if status changed to a problematic state
          if (previousStatus !== subscription.status) {
            // Handle status transitions
            if (subscription.status === 'past_due') {
              await notifyBillingEvent(userId, 'SUBSCRIPTION_PAST_DUE');
            } else if (subscription.status === 'incomplete') {
              await notifyBillingEvent(userId, 'SUBSCRIPTION_INCOMPLETE');
            } else if (subscription.status === 'paused') {
              await notifyBillingEvent(userId, 'SUBSCRIPTION_INCOMPLETE');
            }
          }
        } catch (error) {
          logErrorFromCatch(error, 'app', 'webhook');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = await extractUserIdFromSubscription(subscription.id);

        if (!userId) {
          return successResponse(res, { received: true });
        }

        try {
          await updateSubscriptionStatus(userId, {
            status: 'canceled',
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
          });

          // Store cancellation timestamp
          await db.query(
            'UPDATE user_personal_info SET subscription_cancelled_at = CURRENT_TIMESTAMP WHERE user_id = $1',
            [userId]
          );

          // Notify user of cancellation via email, SMS, and in-app
          await notifyBillingEvent(userId, 'SUBSCRIPTION_CANCELLED');
        } catch (error) {
          logErrorFromCatch(error, 'app', 'webhook');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          const userId = await extractUserIdFromSubscription(invoice.subscription);
          if (userId) {
            try {
              await updateSubscriptionStatus(userId, {
                status: 'active',
                current_period_start: invoice.period_start,
                current_period_end: invoice.period_end,
              });
            } catch (error) {
              logErrorFromCatch(error, 'app', 'webhook');
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          const userId = await extractUserIdFromSubscription(invoice.subscription);
          if (userId) {
            try {
              await updateSubscriptionStatus(userId, {
                status: 'past_due',
                current_period_start: invoice.period_start,
                current_period_end: invoice.period_end,
              });

              // Notify user of payment failure via email, SMS, and in-app
              await notifyBillingEvent(userId, 'PAYMENT_FAILED', {
                invoiceId: invoice.id,
                amount: invoice.amount_due,
                currency: invoice.currency,
                dueDate: new Date(invoice.due_date * 1000).toISOString()
              });
            } catch (error) {
              logErrorFromCatch(error, 'app', 'webhook');
            }
          }
        }
        break;
      }

      case 'payment_method.detached': {
        // Payment method was removed - verify subscription still has a default method
        const paymentMethod = event.data.object;
        const customerId = paymentMethod.customer;

        if (customerId) {
          try {
            // Find user by customer ID
            const userQuery = `SELECT user_id FROM user_personal_info 
                         WHERE stripe_customer_id_encrypted IS NOT NULL LIMIT 100`;
            const allUsers = await db.query(userQuery);

            for (const user of allUsers.rows) {
              const decryptQuery = `SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as cid 
                               FROM user_personal_info WHERE user_id = $2`;
              const result = await db.query(decryptQuery, [process.env.ENCRYPTION_KEY, user.user_id]);
              
              if (result.rows[0]?.cid === customerId) {
                // Notify user to add payment method
                await notifyBillingEvent(user.user_id, 'PAYMENT_METHOD_INVALID');
                break;
              }
            }
          } catch (error) {
            logErrorFromCatch(error, 'app', 'webhook-payment-method');
          }
        }
        break;
      }

      default:
    }

    res.json({ received: true });
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe-webhook', null, null, 'critical');
    return serverError(res, 'Webhook processing failed');
  }
});

export default router;
