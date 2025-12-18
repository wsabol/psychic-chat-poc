import { stripe } from './stripeClient.js';

export function verifyWebhookSignature(body, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('[STRIPE] Webhook signature verification failed:', error);
    throw error;
  }
}
