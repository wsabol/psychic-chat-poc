import express from 'express';
import { db } from '../../shared/db.js';
import {
  verifyWebhookSignature,
  updateSubscriptionStatus,
  storeSubscriptionData,
} from '../../services/stripeService.js';
import Stripe from 'stripe';

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
    console.log('[WEBHOOK] Received event, verifying signature...');

    let event;
    try {
      event = verifyWebhookSignature(req.body, req.headers['stripe-signature']);
    } catch (error) {
      console.error('[WEBHOOK] Signature verification failed:', error.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    console.log('[WEBHOOK] Verified event type:', event.type);

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
        console.error('[WEBHOOK] Error extracting user ID:', error);
      }
      return null;
    };

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created': {
        console.log('[WEBHOOK] Processing: customer.subscription.created');
        const subscription = event.data.object;
        const userId = await extractUserIdFromSubscription(subscription.id);

        if (!userId) {
          console.warn('[WEBHOOK] Could not find user for subscription:', subscription.id);
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
          console.log('[WEBHOOK] Stored subscription for user:', userId);
        } catch (error) {
          console.error('[WEBHOOK] Error storing subscription:', error);
        }
        break;
      }

      case 'customer.subscription.updated': {
        console.log('[WEBHOOK] Processing: customer.subscription.updated');
        const subscription = event.data.object;
        const userId = await extractUserIdFromSubscription(subscription.id);

        if (!userId) {
          console.warn('[WEBHOOK] Could not find user for subscription:', subscription.id);
          return res.json({ received: true });
        }

        try {
          await updateSubscriptionStatus(userId, {
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
          });
          console.log('[WEBHOOK] Updated subscription status for user:', userId);
        } catch (error) {
          console.error('[WEBHOOK] Error updating subscription:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        console.log('[WEBHOOK] Processing: customer.subscription.deleted');
        const subscription = event.data.object;
        const userId = await extractUserIdFromSubscription(subscription.id);

        if (!userId) {
          console.warn('[WEBHOOK] Could not find user for subscription:', subscription.id);
          return res.json({ received: true });
        }

        try {
          await updateSubscriptionStatus(userId, {
            status: 'canceled',
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
          });
          console.log('[WEBHOOK] Marked subscription as canceled for user:', userId);
        } catch (error) {
          console.error('[WEBHOOK] Error canceling subscription:', error);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        console.log('[WEBHOOK] Processing: invoice.payment_succeeded');
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
              console.log('[WEBHOOK] Marked subscription as active for user:', userId);
            } catch (error) {
              console.error('[WEBHOOK] Error updating subscription to active:', error);
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        console.log('[WEBHOOK] Processing: invoice.payment_failed');
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
              console.log('[WEBHOOK] Marked subscription as past_due for user:', userId);
            } catch (error) {
              console.error('[WEBHOOK] Error updating subscription to past_due:', error);
            }
          }
        }
        break;
      }

      default:
        console.log('[WEBHOOK] Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
