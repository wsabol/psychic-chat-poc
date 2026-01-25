/**
 * Price Configuration Constants
 * Central configuration for price management operations
 */

/**
 * Product configurations for different subscription intervals
 */
export const PRODUCT_CONFIGS = {
  month: {
    name: 'Monthly subscription',
    description: 'Full access with renewal each month',
    interval: 'month',
  },
  year: {
    name: 'Annual subscription',
    description: 'Full access with payments once per year',
    interval: 'year',
  },
};

/**
 * Stripe price creation defaults
 */
export const PRICE_DEFAULTS = {
  currency: 'usd',
  taxBehavior: 'exclusive', // Tax calculated separately from price
  intervalCount: 1,
  prorationBehavior: 'none', // No immediate charge, change takes effect at next billing cycle
  billingCycleAnchor: 'unchanged', // Keep the current billing date
};

/**
 * Metadata tags for tracking
 */
export const METADATA_TAGS = {
  createdBy: 'admin_price_management',
  subscriptionType: 'subscription',
};

/**
 * Migration query settings
 */
export const MIGRATION_SETTINGS = {
  notificationWindowDays: 60, // Days to look back for notifications
};

/**
 * Stripe API limits
 */
export const STRIPE_LIMITS = {
  priceListLimit: 100,
};
