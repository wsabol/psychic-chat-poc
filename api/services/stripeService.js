// Barrel export for all Stripe service functions
// This maintains backward compatibility with existing imports

// Customer management
export { getOrCreateStripeCustomer, setDefaultPaymentMethod } from './stripe/customers.js';

// Payment methods
export { createSetupIntent, listPaymentMethods, deletePaymentMethod } from './stripe/paymentMethods.js';

// Subscriptions & billing
export {
  createSubscription,
  getSubscriptions,
  cancelSubscription,
  getInvoices,
  getCharges,
  getAvailablePrices,
} from './stripe/subscriptions.js';

// Webhooks
export { verifyWebhookSignature } from './stripe/webhooks.js';

// Database operations
export {
  storeSubscriptionData,
  getStoredSubscriptionData,
  updateSubscriptionStatus,
} from './stripe/database.js';

// Default export for stripe instance
export { stripe as default } from './stripe/stripeClient.js';
