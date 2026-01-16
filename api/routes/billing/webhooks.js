import express from 'express';
import { db } from '../../shared/db.js';
import {
  verifyWebhookSignature,
  updateSubscriptionStatus,
  storeSubscriptionData,
} from '../../services/stripeService.js';
import Stripe from 'stripe';
import { serverError } from '../../utils/responses.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

const router = express.Router();

/**
 * Stripe Webhook Handler
 * 
 * IMPORTANT: This endpoint must be BEFORE authentication middleware
 * Stripe sends a raw body and specific headers for signature verification
 * 
 * Handles events:
 * - customer.subscription.created -> Store subscription
 * - customer.subscription.updated -> Update status and period dates
 * - customer.subscription.deleted -> Mark as cancelled
 * - invoice.payment_succeeded -> Mark subscription as active
 * - invoice.payment_failed -> Mark subscription as past_due
 */
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    let event;
    try {
      event = verifyWebhookSignature(req.body, req.headers['stripe-signature']);
    } catch (error) {
      return serverError(res, 'Webhook signature verification failed');
    }

    // Extract user ID from Stripe metadata
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

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const userId = await extractUserIdFromSubscription(subscription.id);

        if (!userId) {
          return res.json({ received: true });
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
          return res.json({ received: true });
        }

        try {
          await updateSubscriptionStatus(userId, {
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
          });
        } catch (error) {
          logErrorFromCatch(error, 'app', 'webhook');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = await extractUserIdFromSubscription(subscription.id);

        if (!userId) {
          return res.json({ received: true });
        }

        try {
          await updateSubscriptionStatus(userId, {
            status: 'canceled',
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
          });
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
            } catch (error) {
              logErrorFromCatch(error, 'app', 'webhook');
            }
          }
        }
        break;
      }

      default:
    }

    res.json({ received: true });
  } catch (error) {
    return serverError(res, 'Webhook processing failed');
  }
});

export default router;

